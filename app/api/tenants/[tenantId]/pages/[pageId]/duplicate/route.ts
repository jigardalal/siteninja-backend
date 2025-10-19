import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createdResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
} from '@/utils/apiResponse';
import { DuplicatePageSchema } from '@/schemas/page.schema';

/**
 * POST /api/tenants/:tenantId/pages/:pageId/duplicate
 *
 * Duplicate an existing page with new slug and title
 *
 * Request body:
 * - newSlug: Slug for the duplicated page (required)
 * - newTitle: Title for the duplicated page (optional, defaults to "Copy of {original}")
 * - copySettings: Copy page settings (default: true)
 * - copySections: Copy all sections (default: true)
 * - copySeo: Copy SEO metadata (default: true)
 *
 * Creates duplicate in a transaction with new IDs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = params;
    const body = await request.json();

    // Validate request body
    const result = DuplicatePageSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { newSlug, newTitle, copySettings, copySections, copySeo } = result.data;

    // Fetch original page
    const originalPage = await prisma.page.findFirst({
      where: {
        id: pageId,
        tenantId,
      },
      include: {
        sections: copySections ? { orderBy: { sortOrder: 'asc' } } : false,
        seo: copySeo || false,
      },
    });

    if (!originalPage || originalPage.deletedAt) {
      return notFoundResponse('Page');
    }

    // Check for duplicate slug
    const existingSlug = await prisma.page.findFirst({
      where: {
        tenantId,
        slug: newSlug,
        deletedAt: null,
      },
    });

    if (existingSlug) {
      return conflictResponse('A page with this slug already exists');
    }

    // Duplicate page and related data in a transaction
    const duplicatedPage = await prisma.$transaction(async (tx) => {
      // Create new page
      const newPage = await tx.page.create({
        data: {
          tenantId,
          title: newTitle || `Copy of ${originalPage.title}`,
          slug: newSlug,
          description: originalPage.description,
          status: 'draft', // Always create duplicates as draft
          templateId: originalPage.templateId,
          settings: copySettings ? originalPage.settings : null,
        },
      });

      // Copy sections if requested
      if (copySections && originalPage.sections && originalPage.sections.length > 0) {
        await tx.section.createMany({
          data: originalPage.sections.map((section) => ({
            pageId: newPage.id,
            sectionId: section.sectionId,
            type: section.type,
            content: section.content,
            sortOrder: section.sortOrder,
          })),
        });
      }

      // Copy SEO metadata if requested
      if (copySeo && originalPage.seo) {
        await tx.seoMetadata.create({
          data: {
            pageId: newPage.id,
            metaTitle: originalPage.seo.metaTitle,
            metaDescription: originalPage.seo.metaDescription,
            keywords: originalPage.seo.keywords,
            canonicalUrl: null, // Clear canonical URL for duplicate
            ogTitle: originalPage.seo.ogTitle,
            ogDescription: originalPage.seo.ogDescription,
            ogImage: originalPage.seo.ogImage,
            twitterCard: originalPage.seo.twitterCard,
            twitterTitle: originalPage.seo.twitterTitle,
            twitterDescription: originalPage.seo.twitterDescription,
            twitterImage: originalPage.seo.twitterImage,
            schemaMarkup: originalPage.seo.schemaMarkup,
            robots: originalPage.seo.robots,
          },
        });
      }

      // Fetch complete duplicated page
      return tx.page.findUnique({
        where: { id: newPage.id },
        include: {
          sections: { orderBy: { sortOrder: 'asc' } },
          seo: true,
        },
      });
    });

    return createdResponse(duplicatedPage, 'Page duplicated successfully');
  } catch (error: any) {
    console.error('Error duplicating page:', error);
    return errorResponse('Failed to duplicate page: ' + error.message);
  }
}
