import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  conflictResponse,
  paginatedResponse,
} from '@/utils/apiResponse';
import { parsePaginationParams, calculateSkip, buildPrismaOrderBy } from '@/utils/pagination';
import { CreateTenantSchema, TenantQuerySchema } from '@/schemas/tenant.schema';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { logCreate } from '@/services/audit.service';
import { triggerWebhooks } from '@/services/webhook.service';
import { getCached, setCached, CacheKeys, CacheTTL } from '@/services/cache.service';

/**
 * GET /api/tenants
 *
 * List all tenants with pagination, filtering, and search
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort: Sort field (default: 'createdAt')
 * - order: Sort order 'asc' | 'desc' (default: 'desc')
 * - status: Filter by status
 * - businessType: Filter by business type
 * - search: Search in name, businessName, subdomain
 * - includeDeleted: Include soft-deleted records (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication - only admins and super_admins can list all tenants
    const authResult = await requireAuth(request, ['admin', 'super_admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = TenantQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return validationErrorResponse(
        queryResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { page, limit, sort, order, status, businessType, search, includeDeleted } = queryResult.data;

    // Try cache (only for non-filtered, non-search queries)
    const cacheKey = `tenants:list:${page}:${limit}:${sort}:${order}:${status}:${businessType}`;
    if (!search && !includeDeleted) {
      const cached = await getCached<any>(cacheKey);
      if (cached) {
        return paginatedResponse(cached.tenants, page!, limit!, cached.total);
      }
    }

    // Build where clause for filtering
    const where: Prisma.TenantWhereInput = {
      ...(status && { status }),
      ...(businessType && { businessType }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { businessName: { contains: search, mode: 'insensitive' } },
          { subdomain: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(!includeDeleted && { deletedAt: null }),
    };

    // Execute query with pagination
    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: calculateSkip(page!, limit!),
        take: limit,
        orderBy: buildPrismaOrderBy(sort!, order!),
        include: {
          branding: true,
          subscription: true,
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    // Cache result
    if (!search && !includeDeleted) {
      await setCached(cacheKey, { tenants, total }, CacheTTL.short);
    }

    return paginatedResponse(tenants, page!, limit!, total);
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * POST /api/tenants
 *
 * Create a new tenant with default branding and domain lookup entry
 *
 * Request body:
 * - name: Display name (required)
 * - businessName: Legal business name (required)
 * - subdomain: Unique subdomain (optional, but either subdomain or customDomain required)
 * - customDomain: Custom domain (optional)
 * - All other tenant fields (optional)
 *
 * Response: 201 Created with tenant data
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication - only super_admins can create tenants
    const authResult = await requireAuth(request, ['super_admin']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();

    // Validate request body
    const result = CreateTenantSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check for duplicate subdomain
    if (data.subdomain) {
      const existingSubdomain = await prisma.tenant.findUnique({
        where: { subdomain: data.subdomain },
      });
      if (existingSubdomain) {
        return conflictResponse('Subdomain already exists');
      }
    }

    // Check for duplicate custom domain
    if (data.customDomain) {
      const existingDomain = await prisma.tenant.findUnique({
        where: { customDomain: data.customDomain },
      });
      if (existingDomain) {
        return conflictResponse('Custom domain already exists');
      }
    }

    // Create tenant with default branding and domain lookup in a transaction
    const tenant = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          ...data,
          // tenantId is auto-generated as UUID by Prisma
        },
        include: {
          branding: true,
          domainLookups: true,
        },
      });

      // Create default branding
      await tx.branding.create({
        data: {
          tenantId: newTenant.id,
          primaryColor: '#3B82F6', // Blue
          secondaryColor: '#10B981', // Green
          accentColor: '#F59E0B', // Amber
          backgroundColor: '#FFFFFF',
          textColor: '#1F2937',
          fontFamily: 'Inter, system-ui, sans-serif',
          headingFont: 'Inter, system-ui, sans-serif',
        },
      });

      // Create domain lookup entries
      if (newTenant.subdomain) {
        await tx.domainLookup.create({
          data: {
            domain: `${newTenant.subdomain}.siteninja.com`,
            tenantId: newTenant.id,
            isActive: true,
          },
        });
      }

      if (newTenant.customDomain) {
        await tx.domainLookup.create({
          data: {
            domain: newTenant.customDomain,
            tenantId: newTenant.id,
            isActive: false, // Requires verification
          },
        });
      }

      // Fetch tenant with all relations
      return tx.tenant.findUnique({
        where: { id: newTenant.id },
        include: {
          branding: true,
          domainLookups: true,
          subscription: true,
        },
      });
    });

    // Log audit
    await logCreate(authResult.id, tenant!.id, 'tenant', tenant!.id, tenant, request);

    // Trigger webhooks (async, non-blocking)
    await triggerWebhooks(tenant!.id, 'tenant.created', {
      id: tenant!.id,
      tenantId: tenant!.tenantId,
      name: tenant!.name,
      subdomain: tenant!.subdomain,
    });

    return createdResponse(tenant, 'Tenant created successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}
