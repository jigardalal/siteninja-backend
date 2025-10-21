import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpsertSeoMetadataSchema } from '@/schemas/seo.schema';

/**
 * GET /api/tenants/:tenantId/pages/:pageId/seo
 *
 * Get SEO metadata for a page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = await params;

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Fetch SEO metadata
    const seo = await prisma.seoMetadata.findUnique({
      where: { pageId },
    });

    if (!seo) {
      return notFoundResponse('SEO metadata');
    }

    return successResponse(seo);
  } catch (error: any) {
    console.error('Error fetching SEO metadata:', error);
    return errorResponse('Failed to fetch SEO metadata: ' + error.message);
  }
}

/**
 * PUT /api/tenants/:tenantId/pages/:pageId/seo
 *
 * Create or update SEO metadata (upsert operation)
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
    const result = UpsertSeoMetadataSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Upsert SEO metadata
    const seo = await prisma.seoMetadata.upsert({
      where: { pageId },
      create: {
        ...data,
        pageId,
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return successResponse(seo, 'SEO metadata saved successfully');
  } catch (error: any) {
    console.error('Error saving SEO metadata:', error);
    return errorResponse('Failed to save SEO metadata: ' + error.message);
  }
}

/**
 * DELETE /api/tenants/:tenantId/pages/:pageId/seo
 *
 * Delete SEO metadata for a page
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = await params;

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Check if SEO metadata exists
    const existing = await prisma.seoMetadata.findUnique({
      where: { pageId },
    });

    if (!existing) {
      return notFoundResponse('SEO metadata');
    }

    // Delete SEO metadata
    await prisma.seoMetadata.delete({
      where: { pageId },
    });

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting SEO metadata:', error);
    return errorResponse('Failed to delete SEO metadata: ' + error.message);
  }
}
