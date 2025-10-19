import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdateSectionSchema } from '@/schemas/section.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/pages/:pageId/sections/:sectionId
 *
 * Get a single section by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string; sectionId: string } }
) {
  try {
    const { tenantId, pageId, sectionId } = params;

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Fetch section (sectionId is the UUID, not the custom sectionId field)
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        pageId,
      },
    });

    if (!section || section.deletedAt) {
      return notFoundResponse('Section');
    }

    return successResponse(section);
  } catch (error: any) {
    console.error('Error fetching section:', error);
    return errorResponse('Failed to fetch section: ' + error.message);
  }
}

/**
 * PUT /api/tenants/:tenantId/pages/:pageId/sections/:sectionId
 *
 * Update an existing section (partial updates allowed)
 *
 * Restrictions:
 * - Cannot update sectionId field (immutable)
 * - Cannot update pageId (immutable)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string; sectionId: string } }
) {
  try {
    const { tenantId, pageId, sectionId } = params;
    const body = await request.json();

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Validate request body
    const result = UpdateSectionSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check if section exists
    const existing = await prisma.section.findFirst({
      where: {
        id: sectionId,
        pageId,
      },
    });

    if (!existing || existing.deletedAt) {
      return notFoundResponse('Section');
    }

    // Update section
    const section = await prisma.section.update({
      where: { id: sectionId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return successResponse(section, 'Section updated successfully');
  } catch (error: any) {
    console.error('Error updating section:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Section');
      }
    }

    return errorResponse('Failed to update section: ' + error.message);
  }
}

/**
 * DELETE /api/tenants/:tenantId/pages/:pageId/sections/:sectionId
 *
 * Delete a section (soft delete by default)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string; sectionId: string } }
) {
  try {
    const { tenantId, pageId, sectionId } = params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Check if section exists
    const existing = await prisma.section.findFirst({
      where: {
        id: sectionId,
        pageId,
      },
    });

    if (!existing || existing.deletedAt) {
      return notFoundResponse('Section');
    }

    if (hardDelete) {
      await prisma.section.delete({
        where: { id: sectionId },
      });
    } else {
      await prisma.section.update({
        where: { id: sectionId },
        data: { deletedAt: new Date() },
      });
    }

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting section:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Section');
      }
    }

    return errorResponse('Failed to delete section: ' + error.message);
  }
}
