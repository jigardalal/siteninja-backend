import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { aiService } from '@/services/ai.service';
import { successResponse, handleApiError } from '@/utils/apiResponse';

/**
 * GET /api/ai/models
 *
 * Get available AI models and current default model
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const availableModels = aiService.getAvailableModels();
    const currentModel = aiService.getDefaultModel();

    return successResponse({
      currentModel,
      availableModels,
      info: {
        'gpt-4o': 'Most capable model, best for complex tasks',
        'gpt-4o-mini': 'Fast and affordable, great for most tasks',
        'gpt-4-turbo': 'High performance, balanced speed and capability',
        'gpt-4': 'Previous generation flagship model',
        'gpt-3.5-turbo': 'Fast and cost-effective for simple tasks',
      },
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
