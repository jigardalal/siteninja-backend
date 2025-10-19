import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { WebhookEvent } from '@/schemas/webhook.schema';

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
  tenantId: string;
}

/**
 * Trigger webhooks for a specific event
 * Finds all active webhooks subscribed to the event and delivers payload
 *
 * @param tenantId - Tenant ID
 * @param eventType - Type of event (e.g., 'page.created')
 * @param payload - Event payload data
 * @returns Promise that resolves when webhooks are queued
 *
 * @example
 * await triggerWebhooks(tenantId, 'page.created', {
 *   id: page.id,
 *   title: page.title,
 *   slug: page.slug,
 * });
 */
export async function triggerWebhooks(
  tenantId: string,
  eventType: WebhookEvent,
  payload: any
): Promise<void> {
  try {
    // Find all active webhooks for this tenant and event
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: {
          has: eventType,
        },
        failureCount: {
          lt: prisma.webhook.fields.maxFailures,
        },
      },
    });

    if (webhooks.length === 0) {
      console.log(`[Webhook] No active webhooks found for ${eventType}`);
      return;
    }

    console.log(
      `[Webhook] Triggering ${webhooks.length} webhook(s) for ${eventType}`
    );

    // Deliver to each webhook (in parallel, non-blocking)
    const deliveryPromises = webhooks.map((webhook) =>
      deliverWebhook(webhook.id, eventType, payload).catch((error) => {
        console.error(
          `[Webhook] Failed to deliver to webhook ${webhook.id}:`,
          error
        );
      })
    );

    // Don't await - let webhooks deliver in background
    Promise.all(deliveryPromises).catch((error) => {
      console.error('[Webhook] Some webhook deliveries failed:', error);
    });
  } catch (error) {
    console.error('[Webhook] Error triggering webhooks:', error);
    // Don't throw - webhook failures should not break the main flow
  }
}

/**
 * Deliver webhook payload to a specific webhook endpoint
 *
 * @param webhookId - Webhook ID
 * @param eventType - Event type
 * @param data - Payload data
 * @returns Promise that resolves when delivery is complete
 */
export async function deliverWebhook(
  webhookId: string,
  eventType: WebhookEvent,
  data: any
): Promise<void> {
  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;

  try {
    // Get webhook configuration
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        tenant: {
          select: {
            id: true,
            tenantId: true,
            name: true,
          },
        },
      },
    });

    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    // Create payload
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
      tenantId: webhook.tenant.tenantId,
    };

    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Send HTTP POST request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': webhookId,
        'X-Webhook-Timestamp': payload.timestamp,
        'User-Agent': 'SiteNinja-Webhooks/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    responseStatus = response.status;
    responseBody = await response.text();

    // Update webhook status
    if (response.ok) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          lastTriggeredAt: new Date(),
          lastStatusCode: responseStatus,
          failureCount: 0, // Reset on success
        },
      });

      console.log(`[Webhook] Successfully delivered to ${webhook.url}`);
    } else {
      // Increment failure count
      const newFailureCount = webhook.failureCount + 1;
      const isDisabled = newFailureCount >= webhook.maxFailures;

      await prisma.webhook.update({
        where: { id: webhookId },
        data: {
          failureCount: newFailureCount,
          lastStatusCode: responseStatus,
          isActive: isDisabled ? false : webhook.isActive,
        },
      });

      if (isDisabled) {
        console.error(
          `[Webhook] Webhook ${webhookId} disabled after ${newFailureCount} failures`
        );
      }

      throw new Error(
        `HTTP ${responseStatus}: ${responseBody.substring(0, 200)}`
      );
    }
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';
    responseStatus = responseStatus || 0;

    // Increment failure count on error
    try {
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
      });

      if (webhook) {
        const newFailureCount = webhook.failureCount + 1;
        const isDisabled = newFailureCount >= webhook.maxFailures;

        await prisma.webhook.update({
          where: { id: webhookId },
          data: {
            failureCount: newFailureCount,
            isActive: isDisabled ? false : webhook.isActive,
          },
        });
      }
    } catch (updateError) {
      console.error('[Webhook] Failed to update failure count:', updateError);
    }

    console.error(`[Webhook] Delivery failed:`, errorMessage);
  } finally {
    // Log delivery attempt
    try {
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          eventType,
          payload: JSON.parse(JSON.stringify(data)),
          responseStatus,
          responseBody: responseBody?.substring(0, 5000), // Limit size
          errorMessage: errorMessage?.substring(0, 1000),
          durationMs: Date.now() - startTime,
        },
      });
    } catch (logError) {
      console.error('[Webhook] Failed to log delivery:', logError);
    }
  }
}

/**
 * Test a webhook by sending a test payload
 *
 * @param webhookId - Webhook ID to test
 * @param eventType - Event type to simulate
 * @param testPayload - Optional custom test payload
 * @returns Delivery result
 */
export async function testWebhook(
  webhookId: string,
  eventType: WebhookEvent,
  testPayload?: any
): Promise<{
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  error?: string;
  durationMs: number;
}> {
  const startTime = Date.now();

  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: {
        tenant: true,
      },
    });

    if (!webhook) {
      return {
        success: false,
        error: 'Webhook not found',
        durationMs: Date.now() - startTime,
      };
    }

    // Create test payload
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: testPayload || {
        test: true,
        message: 'This is a test webhook delivery',
      },
      tenantId: webhook.tenant.tenantId,
    };

    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Send test request
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': webhookId,
        'X-Webhook-Timestamp': payload.timestamp,
        'X-Webhook-Test': 'true',
        'User-Agent': 'SiteNinja-Webhooks/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    const responseBody = await response.text();
    const durationMs = Date.now() - startTime;

    // Log test delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload: JSON.parse(JSON.stringify(payload)),
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 5000),
        errorMessage: response.ok ? null : `Test delivery failed`,
        durationMs,
      },
    });

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    // Log failed test
    try {
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          eventType,
          payload: testPayload || {},
          responseStatus: 0,
          errorMessage: error.message,
          durationMs,
        },
      });
    } catch (logError) {
      console.error('[Webhook] Failed to log test delivery:', logError);
    }

    return {
      success: false,
      error: error.message,
      durationMs,
    };
  }
}

/**
 * Verify webhook signature
 * Use this on the receiving end to verify webhook authenticity
 *
 * @param payload - Webhook payload (raw body)
 * @param signature - Signature from X-Webhook-Signature header
 * @param secret - Webhook secret
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const sig = signature.startsWith('sha256=')
      ? signature.substring(7)
      : signature;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('[Webhook] Signature verification failed:', error);
    return false;
  }
}

/**
 * Generate a webhook secret
 *
 * @returns Random webhook secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Retry failed webhook deliveries
 * Should be run as a background job
 *
 * @param maxRetries - Maximum number of retries
 * @returns Number of retries attempted
 */
export async function retryFailedWebhooks(maxRetries: number = 50): Promise<number> {
  try {
    // Find recent failed deliveries
    const failedDeliveries = await prisma.webhookDelivery.findMany({
      where: {
        responseStatus: {
          not: null,
        },
        OR: [
          { responseStatus: { lt: 200 } },
          { responseStatus: { gte: 400 } },
        ],
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: maxRetries,
      include: {
        webhook: true,
      },
    });

    console.log(
      `[Webhook] Retrying ${failedDeliveries.length} failed deliveries`
    );

    let retried = 0;

    for (const delivery of failedDeliveries) {
      if (delivery.webhook.isActive) {
        await deliverWebhook(
          delivery.webhookId,
          delivery.eventType as WebhookEvent,
          delivery.payload
        );
        retried++;

        // Add delay between retries
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return retried;
  } catch (error) {
    console.error('[Webhook] Error retrying failed webhooks:', error);
    return 0;
  }
}
