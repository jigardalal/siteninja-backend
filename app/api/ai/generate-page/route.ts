import { NextRequest, NextResponse } from 'next/server';
import { successResponse, validationErrorResponse, handleApiError } from '@/utils/apiResponse';
import { z } from 'zod';
import { requireTenantAccess } from '@/middleware/auth';
import { aiService } from '@/services/ai.service';
import { logCreate } from '@/services/audit.service';

interface AuthResult {
  id: string;
}

/**
 * POST /api/ai/generate-page
 *
 * Generate a complete page structure using AI
 */

const GeneratePageSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  businessType: z.enum(['restaurant', 'retail', 'services', 'healthcare', 'education', 'nonprofit', 'other']),
  pageType: z.enum(['home', 'about', 'services', 'contact', 'blog', 'gallery']),
  businessInfo: z.object({
    name: z.string().min(1, 'Business name is required'),
    description: z.string().optional(),
    industry: z.string().optional(),
  }),
  model: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = GeneratePageSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { tenantId, businessType, pageType, businessInfo, model } = result.data;

    // Verify tenant access
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const prompt = `Generate a JSON structure for a ${pageType} page for a ${businessType} named '${businessInfo.name}'. The business description is '${businessInfo.description}'. The page should have a title, slug, description, and an array of sections. Each section should have a sectionId, type, content (as a JSON object), and sortOrder.`;

    // Call AI service
    const generatedJson = await aiService.rewriteContent(
      '',
      prompt,
      model ? { model } : {}
    );

    const generatedPage = JSON.parse(generatedJson);

    // Log the AI usage
    await logCreate(
      (authResult as AuthResult).id,
      tenantId,
      'ai_generate_page',
      'page',
      {
        pageType,
        businessType,
        model: model || aiService.getDefaultModel(),
      },
      request
    );

    const response = {
      page: generatedPage,
      metadata: {
        businessType,
        pageType,
        sectionsGenerated: generatedPage.sections.length,
        timestamp: new Date().toISOString(),
        model: model || aiService.getDefaultModel(),
      },
    };

    return successResponse(response, 'Page generated successfully');
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: unknown }).status;
      if (status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service authentication failed. Please check OPENAI_API_KEY.',
          },
          { status: 500 }
        );
      }
      if (status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'AI service rate limit exceeded. Please try again later.',
          },
          { status: 429 }
        );
      }
    }

    return handleApiError(error, request);
  }
}