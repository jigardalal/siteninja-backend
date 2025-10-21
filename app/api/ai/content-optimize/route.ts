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
 * POST /api/ai/content-optimize
 *
 * Optimize content using AI
 */

const ContentOptimizeSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  type: z.enum(['headline', 'paragraph', 'cta', 'description']).optional(),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal', 'persuasive']).optional(),
  model: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = ContentOptimizeSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { content, tenantId, type, tone, model } = result.data;

    // Verify tenant access
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const instructions = `Optimize this ${type || 'text'} for a ${tone || 'professional'} tone.`;

    // Call AI service
    const optimizedContent = await aiService.rewriteContent(
      content,
      instructions,
      model ? { model } : {}
    );

    const suggestions = [
      {
        suggestion: optimizedContent,
        score: 0.9, // Placeholder score
        reason: 'Optimized for clarity and engagement.', // Placeholder reason
      },
    ];

    // Log the AI usage
    await logCreate(
      (authResult as AuthResult).id,
      tenantId,
      'ai_content_optimize',
      'content',
      {
        originalLength: content.length,
        optimizedLength: optimizedContent.length,
        type,
        tone,
        model: model || aiService.getDefaultModel(),
      },
      request
    );

    const response = {
      original: content,
      suggestions: suggestions,
      metadata: {
        type: type || 'paragraph',
        tone: tone || 'professional',
        timestamp: new Date().toISOString(),
        model: model || aiService.getDefaultModel(),
      },
    };

    return successResponse(response, 'Content optimized successfully');
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