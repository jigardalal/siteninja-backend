import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { BulkUpdateSectionsSchema } from '@/schemas/section.schema';

/**
 * PUT /api/tenants/:tenantId/pages/:pageId/sections/bulk
 *
 * Bulk update multiple sections in one request
 *
 * Request body:
 * - updates: Array of objects with { id, ...updateData }
 *
 * Updates all sections in a transaction
 * Maximum 50 sections per request
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
    const result = BulkUpdateSectionsSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { updates } = result.data;

    // Verify all sections exist and belong to this page
    const sectionIds = updates.map((u) => u.id);
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

    // Perform bulk update in a transaction
    await prisma.$transaction(
      updates.map(({ id, ...updateData }) =>
        prisma.section.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        })
      )
    );

    // Fetch updated sections
    const updatedSections = await prisma.section.findMany({
      where: {
        id: { in: sectionIds },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return successResponse(updatedSections, 'Sections updated successfully');
  } catch (error: any) {
    console.error('Error bulk updating sections:', error);
    return errorResponse('Failed to bulk update sections: ' + error.message);
  }
}
