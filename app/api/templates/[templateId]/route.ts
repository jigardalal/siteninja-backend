import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { handleApiError } from '@/middleware/errorHandler';
import {
  successResponse,
  noContentResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdateTemplateSchema } from '@/schemas/template.schema';
import { logUpdate, logDelete } from '@/services/audit.service';
import { getCached, setCached, deleteCached, CacheKeys, CacheTTL } from '@/services/cache.service';

/**
 * GET /api/templates/:templateId
 * Get template details (including default branding and sections)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    // Try cache
    const cacheKey = `template:${params.templateId}`;
    const cached = await getCached<any>(cacheKey);

    if (cached) {
      return successResponse(cached);
    }

    // Get template
    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
    });

    if (!template) {
      return notFoundResponse('Template');
    }

    // Cache result
    await setCached(cacheKey, template, CacheTTL.long);

    return successResponse(template);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/templates/:templateId
 * Update template (admin/super_admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    // Require admin or super_admin
    const auth = await requireAuth(request, ['admin', 'super_admin']);
    if (auth instanceof NextResponse) return auth;

    // Validate request body
    const body = await validateBody(request, UpdateTemplateSchema);
    if (body instanceof NextResponse) return body;

    // Get existing template
    const existingTemplate = await prisma.template.findUnique({
      where: { id: params.templateId },
    });

    if (!existingTemplate) {
      return notFoundResponse('Template');
    }

    // Update template
    const template = await prisma.template.update({
      where: { id: params.templateId },
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        industry: body.industry,
        previewImage: body.previewImage,
        isPremium: body.isPremium,
        isActive: body.isActive,
        defaultBranding: body.defaultBranding,
        defaultSections: body.defaultSections,
        sortOrder: body.sortOrder,
      },
    });

    // Invalidate cache
    await deleteCached(`template:${params.templateId}`);
    await deleteCached(`templates:*`); // Invalidate list cache

    // Log audit
    await logUpdate(
      auth.id,
      undefined,
      'template',
      template.id,
      existingTemplate,
      template,
      request
    );

    return successResponse(template, 'Template updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/templates/:templateId
 * Delete template (admin/super_admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    // Require super_admin only
    const auth = await requireAuth(request, ['super_admin']);
    if (auth instanceof NextResponse) return auth;

    // Get template for audit
    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
    });

    if (!template) {
      return notFoundResponse('Template');
    }

    // Soft delete by setting deletedAt
    await prisma.template.update({
      where: { id: params.templateId },
      data: { deletedAt: new Date() },
    });

    // Invalidate cache
    await deleteCached(`template:${params.templateId}`);

    // Log audit
    await logDelete(auth.id, undefined, 'template', params.templateId, template, request);

    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
