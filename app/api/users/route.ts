import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  conflictResponse,
  paginatedResponse,
} from '@/utils/apiResponse';
import { parsePaginationParams, calculateSkip, buildPrismaOrderBy } from '@/utils/pagination';
import { CreateUserSchema, UserQuerySchema } from '@/schemas/user.schema';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { logCreate } from '@/services/audit.service';
import { triggerWebhooks } from '@/services/webhook.service';
import { getCached, setCached, CacheTTL } from '@/services/cache.service';

/**
 * GET /api/users
 *
 * List all users with pagination, filtering, and search
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication - admins can see all users, regular users can see users in their tenant
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = UserQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return validationErrorResponse(
        queryResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { page, limit, sort, order, tenantId, role, status, search } = queryResult.data;

    // Try cache (only for non-filtered, non-search queries)
    const cacheKey = `users:list:${page}:${limit}:${sort}:${order}:${tenantId}:${role}:${status}:${authResult.tenantId}`;
    if (!search) {
      const cached = await getCached<any>(cacheKey);
      if (cached) {
        return paginatedResponse(cached.users, page!, limit!, cached.total);
      }
    }

    // Build where clause with tenant isolation
    const where: Prisma.UserWhereInput = {
      ...(tenantId && { tenantId }),
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      // Tenant isolation: non-super_admins can only see users in their tenant
      ...(authResult.role !== 'super_admin' && authResult.tenantId && { tenantId: authResult.tenantId }),
    };

    // Execute query with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: calculateSkip(page!, limit!),
        take: limit,
        orderBy: buildPrismaOrderBy(sort!, order!),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          tenantId: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          // Exclude passwordHash from response
          tenant: {
            select: {
              id: true,
              name: true,
              tenantId: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Cache result
    if (!search) {
      await setCached(cacheKey, { users, total }, CacheTTL.short);
    }

    return paginatedResponse(users, page!, limit!, total);
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * POST /api/users
 *
 * Create a new user with hashed password
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication - only admins can create users
    const authResult = await requireAuth(request, ['admin', 'super_admin', 'owner']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();

    // Validate request body
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { password, ...data } = result.data;

    // Check for duplicate email
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingEmail) {
      return conflictResponse('A user with this email already exists');
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return errorResponse('Invalid tenant ID', 400);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        // Exclude passwordHash from response
        tenant: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    // Log audit
    await logCreate(authResult.id, user.tenantId, 'user', user.id, user, request);

    // Trigger webhooks
    await triggerWebhooks(user.tenantId, 'user.created', {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    return createdResponse(user, 'User created successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}
