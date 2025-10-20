import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/middleware/auth';
import { aiService, EnhanceContentOptions } from '@/services/ai.service';
import { successResponse, validationErrorResponse, handleApiError } from '@/utils/apiResponse';
import { logCreate } from '@/services/audit.service';

/**
 * POST /api/ai/enhance
 *
 * Enhance content using AI
 * Requires authentication and valid tenant access
 */

// Request validation schema
const EnhanceRequestSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content too long (max 5000 characters)'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal', 'creative']).optional(),
  length: z.enum(['shorter', 'longer', 'similar']).optional(),
  focus: z.string().max(200).optional(),
  model: z.string().optional(), // Allow model override
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = EnhanceRequestSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { content, tenantId, tone, length, focus, model } = result.data;

    // Verify tenant access
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Prepare enhancement options
    const options: EnhanceContentOptions = {
      tone,
      length,
      focus,
    };

    // Allow model override if provided
    if (model) {
      options.config = { model };
    }

    // Call AI service
    const enhanced = await aiService.enhanceContent(content, options);

    // Log the AI usage for audit trail
    await logCreate(
      authResult.id as string,
      tenantId,
      'ai_enhancement',
      'content',
      {
        originalLength: content.length,
        enhancedLength: enhanced.enhancedText.length,
        tone: enhanced.tone,
        model: model || aiService.getDefaultModel(),
      },
      request
    );

    return successResponse(
      {
        original: content,
        enhanced: enhanced.enhancedText,
        metadata: {
          tone: enhanced.tone,
          improvements: enhanced.improvements,
          wordCount: enhanced.wordCount,
          model: model || aiService.getDefaultModel(),
        },
      },
      'Content enhanced successfully'
    );
  } catch (error: any) {
    // Handle OpenAI specific errors
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
