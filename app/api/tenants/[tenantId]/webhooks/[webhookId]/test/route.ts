import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAccess } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { handleApiError } from '@/middleware/errorHandler';
import { successResponse, notFoundResponse } from '@/utils/apiResponse';
import { TestWebhookSchema } from '@/schemas/webhook.schema';
import { testWebhook } from '@/services/webhook.service';

/**
 * POST /api/tenants/:tenantId/webhooks/:webhookId/test
 * Test a webhook by sending a test payload
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string; webhookId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Validate request body
    const body = await validateBody(request, TestWebhookSchema);
    if (body instanceof NextResponse) return body;

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!tenant) {
      return notFoundResponse('Tenant');
    }

    // Verify webhook belongs to tenant
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.webhookId,
        tenantId: tenant.id,
      },
    });

    if (!webhook) {
      return notFoundResponse('Webhook');
    }

    // Test webhook
    const result = await testWebhook(
      params.webhookId,
      body.eventType,
      body.payload
    );

    return successResponse(result, 'Webhook test completed');
  } catch (error) {
    return handleApiError(error);
  }
}
