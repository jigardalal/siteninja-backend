import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdateTenantSchema } from '@/schemas/tenant.schema';
import { Prisma } from '@prisma/client';
import { requireTenantAccess } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { logUpdate, logDelete } from '@/services/audit.service';
import { triggerWebhooks } from '@/services/webhook.service';
import { getCached, setCached, invalidateCache, CacheTTL } from '@/services/cache.service';

/**
 * GET /api/tenants/:tenantId
 *
 * Get a single tenant by ID with related data
 *
 * Response includes:
 * - Tenant data
 * - Branding
 * - Subscription
 * - Domain lookups
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = await params;

    // Require tenant access - users can only access their own tenant
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Try cache first
    const cacheKey = `tenant:${tenantId}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branding: true,
        subscription: true,
        domainLookups: true,
      },
    });

    if (!tenant) {
      return notFoundResponse('Tenant');
    }

    // Exclude soft-deleted tenants unless explicitly included
    if (tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Cache result
    await setCached(cacheKey, tenant, CacheTTL.medium);

    return successResponse(tenant);
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/tenants/:tenantId
 *
 * Update an existing tenant (partial updates allowed)
 *
 * Request body: Partial tenant data (all fields optional)
 *
 * Restrictions:
 * - Cannot update tenantId (immutable)
 * - Cannot update subdomain (immutable after creation)
 * - Cannot update customDomain (immutable after creation)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = await params;

    // Require tenant access with admin role
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Only admins, owners, and super_admins can update tenant details
    if (!['admin', 'super_admin', 'owner'].includes(authResult.role as string)) {
      return errorResponse('Only admins can update tenant details', 403);
    }
    const body = await request.json();

    // Validate request body
    const result = UpdateTenantSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check if tenant exists
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existing || existing.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Update tenant
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        branding: true,
        subscription: true,
        domainLookups: true,
      },
    });

    // Log audit
    await logUpdate(authResult.id, tenant.id, 'tenant', tenant.id, existing, tenant, request);

    // Trigger webhooks
    await triggerWebhooks(tenant.id, 'tenant.updated', {
      id: tenant.id,
      tenantId: tenant.tenantId,
      name: tenant.name,
      changes: Object.keys(data),
    });

    // Invalidate cache
    await invalidateCache(`tenant:${tenantId}`);
    await invalidateCache('tenants:list:*');

    return successResponse(tenant, 'Tenant updated successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/tenants/:tenantId
 *
 * Delete a tenant (soft delete by default, hard delete with ?hard=true)
 *
 * Query parameters:
 * - hard: Set to 'true' for permanent deletion (default: false)
 *
 * Soft delete: Sets deletedAt timestamp
 * Hard delete: Permanently removes record and cascades to related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = await params;

    // Only super_admins can delete tenants
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (authResult.role !== 'super_admin') {
      return errorResponse('Only super admins can delete tenants', 403);
    }
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Check if tenant exists
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existing || existing.deletedAt) {
      return notFoundResponse('Tenant');
    }

    if (hardDelete) {
      // Permanent deletion (cascades via Prisma schema)
      await prisma.tenant.delete({
        where: { id: tenantId },
      });
    } else {
      // Soft delete
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    // Log audit
    await logDelete(authResult.id, existing.id, 'tenant', existing.id, existing, request);

    // Trigger webhooks
    await triggerWebhooks(existing.id, 'tenant.deleted', {
      id: existing.id,
      tenantId: existing.tenantId,
      name: existing.name,
      hardDelete,
    });

    // Invalidate cache
    await invalidateCache(`tenant:${tenantId}`);
    await invalidateCache('tenants:list:*');

    // Return 204 No Content
    return new Response(null, { status: 204 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
