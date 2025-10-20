import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/middleware/auth';
import { aiService } from '@/services/ai.service';
import { successResponse, validationErrorResponse, handleApiError } from '@/utils/apiResponse';
import { logCreate } from '@/services/audit.service';

/**
 * POST /api/ai/rewrite
 *
 * Rewrite content with custom instructions using AI
 * Requires authentication and valid tenant access
 */

// Request validation schema
const RewriteRequestSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content too long'),
  instructions: z.string().min(5, 'Instructions must be at least 5 characters').max(500, 'Instructions too long'),
  tenantId: z.string().uuid('Invalid tenant ID'),
  model: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = RewriteRequestSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { content, instructions, tenantId, model } = result.data;

    // Verify tenant access
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Call AI service with optional model override
    const rewrittenContent = await aiService.rewriteContent(
      content,
      instructions,
      model ? { model } : {}
    );

    // Log the AI usage
    await logCreate(
      authResult.id as string,
      tenantId,
      'ai_rewrite',
      'content',
      {
        originalLength: content.length,
        rewrittenLength: rewrittenContent.length,
        instructions,
        model: model || aiService.getDefaultModel(),
      },
      request
    );

    return successResponse(
      {
        original: content,
        rewritten: rewrittenContent,
        metadata: {
          instructions,
          model: model || aiService.getDefaultModel(),
        },
      },
      'Content rewritten successfully'
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
