import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdateUserSchema } from '@/schemas/user.schema';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { logUpdate, logDelete } from '@/services/audit.service';
import { triggerWebhooks } from '@/services/webhook.service';
import { getCached, setCached, invalidateCache, CacheTTL } from '@/services/cache.service';

/**
 * GET /api/users/:userId
 *
 * Get a single user by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require authentication - users can view their own profile or admins can view any
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = await params;

    // Check if user is accessing their own profile or is an admin
    if (authResult.id !== userId && authResult.role !== 'super_admin' && authResult.role !== 'admin') {
      return errorResponse('You can only view your own profile', 403);
    }

    // Try cache first
    const cacheKey = `user:${userId}`;
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      return notFoundResponse('User');
    }

    // Cache result
    await setCached(cacheKey, user, CacheTTL.medium);

    return successResponse(user);
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/users/:userId
 *
 * Update an existing user (partial updates allowed)
 *
 * Restrictions:
 * - Cannot update password (use separate endpoint)
 * - Cannot update email (immutable)
 * - Cannot update tenantId (immutable)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require authentication - users can update their own profile or admins can update any
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = await params;

    // Check if user is updating their own profile or is an admin
    if (authResult.id !== userId && authResult.role !== 'super_admin' && authResult.role !== 'admin' && authResult.role !== 'owner') {
      return errorResponse('You can only update your own profile', 403);
    }

    const body = await request.json();

    // Validate request body
    const result = UpdateUserSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      return notFoundResponse('User');
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
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
    await logUpdate(authResult.id, user.tenantId, 'user', user.id, existing, user, request);

    // Trigger webhooks
    await triggerWebhooks(user.tenantId, 'user.updated', {
      id: user.id,
      email: user.email,
      role: user.role,
      changes: Object.keys(data),
    });

    // Invalidate cache
    await invalidateCache(`user:${userId}`);
    await invalidateCache('users:list:*');

    return successResponse(user, 'User updated successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/users/:userId
 *
 * Delete a user (hard delete only - users are not soft deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Only admins can delete users
    const authResult = await requireAuth(request, ['admin', 'super_admin', 'owner']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = await params;

    // Prevent users from deleting themselves
    if (authResult.id === userId) {
      return errorResponse('You cannot delete your own account', 400);
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      return notFoundResponse('User');
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    // Log audit
    await logDelete(authResult.id, existing.tenantId, 'user', existing.id, existing, request);

    // Trigger webhooks
    await triggerWebhooks(existing.tenantId, 'user.deleted', {
      id: existing.id,
      email: existing.email,
      role: existing.role,
    });

    // Invalidate cache
    await invalidateCache(`user:${userId}`);
    await invalidateCache('users:list:*');

    return new Response(null, { status: 204 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
