import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdatePageSchema, PageIncludeSchema } from '@/schemas/page.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/pages/:pageId
 *
 * Get a single page by ID with optional related data
 *
 * Query parameters:
 * - include: Comma-separated list of relations (sections, seo, navigation, template)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = params;
    const { searchParams } = new URL(request.url);

    // Parse include parameter
    const includeStr = searchParams.get('include') || '';
    const includeParts = includeStr.split(',').filter(Boolean);

    const page = await prisma.page.findFirst({
      where: {
        id: pageId,
        tenantId,
      },
      include: {
        sections: includeParts.includes('sections') ? { orderBy: { sortOrder: 'asc' } } : false,
        seo: includeParts.includes('seo'),
        navigation: includeParts.includes('navigation'),
        template: includeParts.includes('template'),
      },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    return successResponse(page);
  } catch (error: any) {
    console.error('Error fetching page:', error);
    return errorResponse('Failed to fetch page: ' + error.message);
  }
}

/**
 * PUT /api/tenants/:tenantId/pages/:pageId
 *
 * Update an existing page (partial updates allowed)
 *
 * Restrictions:
 * - Cannot update slug (immutable after creation)
 * - Cannot update tenantId (immutable)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = params;
    const body = await request.json();

    // Validate request body
    const result = UpdatePageSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check if page exists
    const existing = await prisma.page.findFirst({
      where: {
        id: pageId,
        tenantId,
      },
    });

    if (!existing || existing.deletedAt) {
      return notFoundResponse('Page');
    }

    // Update page
    const page = await prisma.page.update({
      where: { id: pageId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        sections: { orderBy: { sortOrder: 'asc' } },
        seo: true,
      },
    });

    return successResponse(page, 'Page updated successfully');
  } catch (error: any) {
    console.error('Error updating page:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Page');
      }
    }

    return errorResponse('Failed to update page: ' + error.message);
  }
}

/**
 * DELETE /api/tenants/:tenantId/pages/:pageId
 *
 * Delete a page (soft delete by default, hard delete with ?hard=true)
 *
 * Soft delete: Sets deletedAt timestamp (sections cascade via Prisma)
 * Hard delete: Permanently removes record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    // Check if page exists
    const existing = await prisma.page.findFirst({
      where: {
        id: pageId,
        tenantId,
      },
    });

    if (!existing || existing.deletedAt) {
      return notFoundResponse('Page');
    }

    if (hardDelete) {
      // Permanent deletion (cascades to sections via Prisma schema)
      await prisma.page.delete({
        where: { id: pageId },
      });
    } else {
      // Soft delete (also soft delete sections)
      await prisma.$transaction([
        prisma.page.update({
          where: { id: pageId },
          data: { deletedAt: new Date() },
        }),
        prisma.section.updateMany({
          where: { pageId },
          data: { deletedAt: new Date() },
        }),
      ]);
    }

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting page:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Page');
      }
    }

    return errorResponse('Failed to delete page: ' + error.message);
  }
}
