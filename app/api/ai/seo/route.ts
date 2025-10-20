import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/middleware/auth';
import { aiService, EnhanceSEOOptions } from '@/services/ai.service';
import { successResponse, validationErrorResponse, handleApiError } from '@/utils/apiResponse';
import { logCreate } from '@/services/audit.service';

/**
 * POST /api/ai/seo
 *
 * Generate SEO metadata suggestions using AI
 * Requires authentication and valid tenant access
 */

// Request validation schema
const SEORequestSchema = z.object({
  content: z.string().min(50, 'Content must be at least 50 characters').max(5000, 'Content too long'),
  currentTitle: z.string().min(1, 'Current title is required').max(200),
  tenantId: z.string().uuid('Invalid tenant ID'),
  targetKeywords: z.array(z.string()).optional(),
  businessType: z.string().max(100).optional(),
  model: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = SEORequestSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { content, currentTitle, tenantId, targetKeywords, businessType, model } = result.data;

    // Verify tenant access
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Prepare SEO options
    const options: EnhanceSEOOptions = {
      targetKeywords,
      businessType,
    };

    // Allow model override if provided
    if (model) {
      options.config = { model };
    }

    // Call AI service
    const seoSuggestion = await aiService.enhanceSEO(content, currentTitle, options);

    // Log the AI usage
    await logCreate(
      authResult.id as string,
      tenantId,
      'ai_seo',
      'seo_metadata',
      {
        currentTitle,
        suggestedTitle: seoSuggestion.metaTitle,
        keywordCount: seoSuggestion.keywords.length,
        model: model || aiService.getDefaultModel(),
      },
      request
    );

    return successResponse(
      {
        current: {
          title: currentTitle,
        },
        suggestions: {
          metaTitle: seoSuggestion.metaTitle,
          metaDescription: seoSuggestion.metaDescription,
          keywords: seoSuggestion.keywords,
          improvements: seoSuggestion.suggestions,
        },
        metadata: {
          model: model || aiService.getDefaultModel(),
        },
      },
      'SEO suggestions generated successfully'
    );
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service authentication failed. Please check OPENAI_API_KEY.',
        },
        { status: 500 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service rate limit exceeded. Please try again later.',
        },
        { status: 429 }
      );
    }

    return handleApiError(error, request);
  }
}
