import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdateNavigationSchema } from '@/schemas/navigation.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/navigation/:navId
 *
 * Get a single navigation item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; navId: string } }
) {
  try {
    const { tenantId, navId } = params;

    const navigation = await prisma.navigation.findFirst({
      where: {
        id: navId,
        tenantId,
      },
      include: {
        page: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!navigation) {
      return notFoundResponse('Navigation item');
    }

    return successResponse(navigation);
  } catch (error: any) {
    console.error('Error fetching navigation:', error);
    return errorResponse('Failed to fetch navigation: ' + error.message);
  }
}

/**
 * PUT /api/tenants/:tenantId/navigation/:navId
 *
 * Update a navigation item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string; navId: string } }
) {
  try {
    const { tenantId, navId } = params;
    const body = await request.json();

    // Validate request body
    const result = UpdateNavigationSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check if navigation exists
    const existing = await prisma.navigation.findFirst({
      where: {
        id: navId,
        tenantId,
      },
    });

    if (!existing) {
      return notFoundResponse('Navigation item');
    }

    // Update navigation
    const navigation = await prisma.navigation.update({
      where: { id: navId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        page: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return successResponse(navigation, 'Navigation item updated successfully');
  } catch (error: any) {
    console.error('Error updating navigation:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Navigation item');
      }
    }

    return errorResponse('Failed to update navigation: ' + error.message);
  }
}

/**
 * DELETE /api/tenants/:tenantId/navigation/:navId
 *
 * Delete a navigation item (hard delete only - navigation items are not soft deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; navId: string } }
) {
  try {
    const { tenantId, navId } = params;

    // Check if navigation exists
    const existing = await prisma.navigation.findFirst({
      where: {
        id: navId,
        tenantId,
      },
    });

    if (!existing) {
      return notFoundResponse('Navigation item');
    }

    // Delete navigation
    await prisma.navigation.delete({
      where: { id: navId },
    });

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting navigation:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Navigation item');
      }
    }

    return errorResponse('Failed to delete navigation: ' + error.message);
  }
}
