import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, notFoundResponse } from '@/utils/apiResponse';

/**
 * GET /api/tenants/:tenantId/pages/slug/:slug
 *
 * Get a page by its slug (alternative to ID-based lookup)
 *
 * Useful for:
 * - Public-facing page rendering
 * - SEO-friendly URLs
 * - Frontend routing
 *
 * Returns page with sections and SEO metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; slug: string } }
) {
  try {
    const { tenantId, slug } = await params;

    const page = await prisma.page.findFirst({
      where: {
        tenantId,
        slug,
        deletedAt: null,
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
        seoMetadata: true,
        pageTemplate: { include: { template: true } },
      },
    });

    if (!page) {
      return notFoundResponse('Page');
    }

    return successResponse(page);
  } catch (error: any) {
    console.error('Error fetching page by slug:', error);
    return errorResponse('Failed to fetch page: ' + error.message);
  }
}
