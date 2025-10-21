import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { CreateNavigationSchema, NavigationQuerySchema } from '@/schemas/navigation.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/navigation
 *
 * List all navigation items for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Parse query parameters
    const queryResult = NavigationQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return validationErrorResponse(
        queryResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { isVisible, sort, order } = queryResult.data;

    // Fetch navigation items
    const navigation = await prisma.navigation.findMany({
      where: {
        tenantId,
        ...(isVisible !== undefined && { isVisible }),
      },
      orderBy: { [sort!]: order },
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

    return successResponse(navigation);
  } catch (error: any) {
    console.error('Error listing navigation:', error);
    return errorResponse('Failed to list navigation: ' + error.message);
  }
}

/**
 * POST /api/tenants/:tenantId/navigation
 *
 * Create a new navigation item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Validate request body
    const result = CreateNavigationSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Auto-increment sortOrder if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const maxSortOrder = await prisma.navigation.aggregate({
        where: { tenantId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
    }

    // Create navigation item
    const navigation = await prisma.navigation.create({
      data: {
        ...data,
        tenantId,
        sortOrder,
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

    return createdResponse(navigation, 'Navigation item created successfully');
  } catch (error: any) {
    console.error('Error creating navigation:', error);
    return errorResponse('Failed to create navigation: ' + error.message);
  }
}
