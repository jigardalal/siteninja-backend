import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAccess } from '@/middleware/auth';
import { aiService, GenerateIdeasOptions } from '@/services/ai.service';
import { successResponse, validationErrorResponse, handleApiError } from '@/utils/apiResponse';
import { logCreate } from '@/services/audit.service';

/**
 * POST /api/ai/ideas
 *
 * Generate content ideas using AI
 * Requires authentication and valid tenant access
 */

// Request validation schema
const IdeasRequestSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  count: z.number().min(1).max(20).optional().default(5),
  businessType: z.string().max(100).optional(),
  topic: z.string().max(200).optional(),
  model: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = IdeasRequestSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { tenantId, count, businessType, topic, model } = result.data;

    // Verify tenant access
    const authResult = await requireTenantAccess(request, tenantId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Prepare generation options
    const options: GenerateIdeasOptions = {
      count,
      businessType,
      topic,
    };

    // Allow model override if provided
    if (model) {
      options.config = { model };
    }

    // Call AI service
    const contentIdeas = await aiService.generateContentIdeas(options);

    // Log the AI usage
    await logCreate(
      authResult.id as string,
      tenantId,
      'ai_ideas',
      'content_ideas',
      {
        ideasGenerated: contentIdeas.ideas.length,
        businessType,
        topic,
        model: model || aiService.getDefaultModel(),
      },
      request
    );

    return successResponse(
      {
        ideas: contentIdeas.ideas,
        metadata: {
          count: contentIdeas.ideas.length,
          model: model || aiService.getDefaultModel(),
        },
      },
      'Content ideas generated successfully'
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
