import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { ReorderNavigationSchema } from '@/schemas/navigation.schema';

/**
 * PUT /api/tenants/:tenantId/navigation/reorder
 *
 * Reorder navigation items for a tenant
 *
 * Request body:
 * - navigationIds: Array of navigation UUIDs in desired order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const body = await request.json();

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Validate request body
    const result = ReorderNavigationSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { navigationIds } = result.data;

    // Verify all navigation items exist and belong to this tenant
    const existingItems = await prisma.navigation.findMany({
      where: {
        id: { in: navigationIds },
        tenantId,
      },
    });

    if (existingItems.length !== navigationIds.length) {
      return errorResponse('One or more navigation items not found or do not belong to this tenant', 400);
    }

    // Update sortOrder in a transaction
    await prisma.$transaction(
      navigationIds.map((navId, index) =>
        prisma.navigation.update({
          where: { id: navId },
          data: { sortOrder: index },
        })
      )
    );

    // Fetch updated navigation
    const updatedNavigation = await prisma.navigation.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
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

    return successResponse(updatedNavigation, 'Navigation reordered successfully');
  } catch (error: any) {
    console.error('Error reordering navigation:', error);
    return errorResponse('Failed to reorder navigation: ' + error.message);
  }
}
