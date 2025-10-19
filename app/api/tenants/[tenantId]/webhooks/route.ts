import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAccess } from '@/middleware/auth';
import { validateBody, validateQuery } from '@/middleware/validate';
import { handleApiError } from '@/middleware/errorHandler';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '@/utils/apiResponse';
import {
  CreateWebhookSchema,
  QueryWebhookSchema,
} from '@/schemas/webhook.schema';
import { generateWebhookSecret } from '@/services/webhook.service';
import { logCreate } from '@/services/audit.service';

/**
 * GET /api/tenants/:tenantId/webhooks
 * List all webhooks for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Validate query parameters
    const query = validateQuery(request, QueryWebhookSchema);
    if (query instanceof NextResponse) return query;

    const { isActive, event, page, limit } = query;

    // Build where clause
    const where: any = {
      tenant: {
        tenantId: params.tenantId,
      },
    };

    if (isActive !== undefined) where.isActive = isActive;
    if (event) {
      where.events = {
        has: event,
      };
    }

    // Get webhooks
    const [webhooks, total] = await Promise.all([
      prisma.webhook.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          // Don't expose the secret
        },
      }),
      prisma.webhook.count({ where }),
    ]);

    return paginatedResponse(webhooks, page, limit, total);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/tenants/:tenantId/webhooks
 * Create a new webhook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Validate request body
    const body = await validateBody(request, CreateWebhookSchema);
    if (body instanceof NextResponse) return body;

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Generate webhook secret
    const secret = generateWebhookSecret();

    // Create webhook
    const webhook = await prisma.webhook.create({
      data: {
        tenantId: tenant.id,
        url: body.url,
        events: body.events,
        secret,
        isActive: body.isActive ?? true,
        maxFailures: body.maxFailures ?? 5,
        retryBackoff: body.retryBackoff ?? 60,
      },
    });

    // Log audit
    await logCreate(
      auth.id,
      tenant.id,
      'webhook',
      webhook.id,
      { ...webhook, secret: '[REDACTED]' },
      request
    );

    // Return webhook with secret (ONE TIME ONLY)
    return createdResponse(
      {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret, // Show secret only on creation
        isActive: webhook.isActive,
        maxFailures: webhook.maxFailures,
        retryBackoff: webhook.retryBackoff,
        createdAt: webhook.createdAt,
      },
      'Webhook created successfully. Save the secret - it will not be shown again.'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
