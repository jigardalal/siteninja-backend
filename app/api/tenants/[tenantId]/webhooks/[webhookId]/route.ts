import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAccess } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { handleApiError } from '@/middleware/errorHandler';
import {
  successResponse,
  noContentResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdateWebhookSchema } from '@/schemas/webhook.schema';
import { logUpdate, logDelete } from '@/services/audit.service';

/**
 * GET /api/tenants/:tenantId/webhooks/:webhookId
 * Get webhook details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; webhookId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Get webhook
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.webhookId,
        tenant: {
          tenantId: params.tenantId,
        },
      },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggeredAt: true,
        lastStatusCode: true,
        failureCount: true,
        maxFailures: true,
        retryBackoff: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!webhook) {
      return notFoundResponse('Webhook');
    }

    return successResponse(webhook);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/tenants/:tenantId/webhooks/:webhookId
 * Update webhook
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string; webhookId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Validate request body
    const body = await validateBody(request, UpdateWebhookSchema);
    if (body instanceof NextResponse) return body;

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!tenant) {
      return notFoundResponse('Tenant');
    }

    // Get existing webhook
    const existingWebhook = await prisma.webhook.findFirst({
      where: {
        id: params.webhookId,
        tenantId: tenant.id,
      },
    });

    if (!existingWebhook) {
      return notFoundResponse('Webhook');
    }

    // Update webhook
    const webhook = await prisma.webhook.update({
      where: { id: params.webhookId },
      data: {
        url: body.url,
        events: body.events,
        isActive: body.isActive,
        maxFailures: body.maxFailures,
        retryBackoff: body.retryBackoff,
      },
    });

    // Log audit
    await logUpdate(
      auth.id,
      tenant.id,
      'webhook',
      webhook.id,
      existingWebhook,
      webhook,
      request
    );

    return successResponse(webhook, 'Webhook updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/tenants/:tenantId/webhooks/:webhookId
 * Delete webhook
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; webhookId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!tenant) {
      return notFoundResponse('Tenant');
    }

    // Get webhook for audit
    const webhook = await prisma.webhook.findFirst({
      where: {
        id: params.webhookId,
        tenantId: tenant.id,
      },
    });

    if (!webhook) {
      return notFoundResponse('Webhook');
    }

    // Delete webhook (cascade deletes deliveries)
    await prisma.webhook.delete({
      where: { id: params.webhookId },
    });

    // Log audit
    await logDelete(
      auth.id,
      tenant.id,
      'webhook',
      params.webhookId,
      webhook,
      request
    );

    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
