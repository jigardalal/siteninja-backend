import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { ReorderSectionsSchema } from '@/schemas/section.schema';

/**
 * PUT /api/tenants/:tenantId/pages/:pageId/sections/reorder
 *
 * Reorder sections on a page
 *
 * Request body:
 * - sectionIds: Array of section UUIDs in desired order
 *
 * Each section will be assigned a sortOrder based on its position in the array
 * Uses a transaction to ensure atomicity
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = await params;
    const body = await request.json();

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Validate request body
    const result = ReorderSectionsSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { sectionIds } = result.data;

    // Verify all sections exist and belong to this page
    const existingSections = await prisma.section.findMany({
      where: {
        id: { in: sectionIds },
        pageId,
        deletedAt: null,
      },
    });

    if (existingSections.length !== sectionIds.length) {
      return errorResponse('One or more sections not found or do not belong to this page', 400);
    }

    // Update sortOrder for each section in a transaction
    await prisma.$transaction(
      sectionIds.map((sectionId, index) =>
        prisma.section.update({
          where: { id: sectionId },
          data: { sortOrder: index },
        })
      )
    );

    // Fetch updated sections
    const updatedSections = await prisma.section.findMany({
      where: {
        pageId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(updatedSections, 'Sections reordered successfully');
  } catch (error: any) {
    console.error('Error reordering sections:', error);
    return errorResponse('Failed to reorder sections: ' + error.message);
  }
}
