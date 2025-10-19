import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAccess } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { handleApiError } from '@/middleware/errorHandler';
import { successResponse, notFoundResponse } from '@/utils/apiResponse';
import { ApplyTemplateSchema } from '@/schemas/template.schema';
import { logCreate } from '@/services/audit.service';

/**
 * POST /api/templates/:templateId/apply
 * Apply template to a page
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    // Validate request body
    const body = await validateBody(request, ApplyTemplateSchema);
    if (body instanceof NextResponse) return body;

    // Get page and verify access
    const page = await prisma.page.findUnique({
      where: { id: body.pageId },
      include: { tenant: true },
    });

    if (!page) {
      return notFoundResponse('Page');
    }

    // Check tenant access
    const auth = await requireTenantAccess(request, page.tenant.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Get template
    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
    });

    if (!template) {
      return notFoundResponse('Template');
    }

    // Check if template is active
    if (!template.isActive) {
      return NextResponse.json(
        { success: false, error: 'Template is not active' },
        { status: 400 }
      );
    }

    // Apply template (create or update PageTemplate)
    const pageTemplate = await prisma.pageTemplate.upsert({
      where: { pageId: body.pageId },
      update: {
        templateId: params.templateId,
        customizations: body.customizations || {},
      },
      create: {
        pageId: body.pageId,
        templateId: params.templateId,
        customizations: body.customizations || {},
      },
    });

    // TODO: Apply template's defaultSections to page if page has no sections
    // This would create sections from template.defaultSections

    // Log audit
    await logCreate(
      auth.id,
      page.tenantId,
      'pageTemplate',
      pageTemplate.id,
      pageTemplate,
      request
    );

    return successResponse(
      {
        pageTemplate,
        template: {
          id: template.id,
          name: template.name,
          category: template.category,
        },
      },
      'Template applied successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
