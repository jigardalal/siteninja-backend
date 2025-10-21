import { NextRequest, NextResponse } from 'next/server';
import { successResponse, validationErrorResponse, handleApiError } from '@/utils/apiResponse';
import { z } from 'zod';
import { requireTenantAccess } from '@/middleware/auth';
import { aiService, EnhanceSEOOptions } from '@/services/ai.service';
import { logCreate } from '@/services/audit.service';

interface AuthResult {
  id: string;
}

/**
 * POST /api/ai/seo-optimize
 *
 * Generate SEO-optimized metadata using AI
 */

const SeoOptimizeSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  title: z.string().max(255).optional(),
  tenantId: z.string().uuid('Invalid tenant ID'),
  keywords: z.array(z.string()).max(10).optional(),
  model: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = SeoOptimizeSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { content, title, tenantId, keywords, model } = result.data;

    // Verify tenant access
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const options: EnhanceSEOOptions = {
      targetKeywords: keywords,
    };

    if (model) {
      options.config = { model };
    }

    // Call AI service
    const seoSuggestion = await aiService.enhanceSEO(content, title || '', options);

    // Log the AI usage
    await logCreate(
      (authResult as AuthResult).id,
      tenantId,
      'ai_seo_optimize',
      'seo',
      {
        contentLength: content.length,
        model: model || aiService.getDefaultModel(),
      },
      request
    );

    const response = {
      suggestions: {
        metaTitle: {
          current: title || '',
          suggestions: [seoSuggestion.metaTitle],
        },
        metaDescription: {
          suggestions: [seoSuggestion.metaDescription],
        },
        keywords: {
          current: keywords || [],
          suggestions: seoSuggestion.keywords,
        },
        improvements: seoSuggestion.suggestions.map(suggestion => ({ aspect: 'general', recommended: suggestion, priority: 'medium'})),
      },
      metadata: {
        contentLength: content.length,
        timestamp: new Date().toISOString(),
        model: model || aiService.getDefaultModel(),
      },
    };

    return successResponse(response, 'SEO optimization completed successfully');
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