import { z } from 'zod';

/**
 * List of allowed webhook events
 */
export const WEBHOOK_EVENTS = [
  'page.created',
  'page.updated',
  'page.deleted',
  'page.published',
  'section.created',
  'section.updated',
  'section.deleted',
  'branding.updated',
  'tenant.created',
  'tenant.updated',
  'user.created',
  'user.updated',
  'navigation.created',
  'navigation.updated',
  'navigation.deleted',
] as const;

/**
 * Schema for creating a new webhook
 */
export const CreateWebhookSchema = z.object({
  url: z
    .string()
    .url('Invalid webhook URL')
    .min(1, 'Webhook URL is required')
    .max(2048, 'URL too long'),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, 'At least one event is required')
    .refine(
      (events) => new Set(events).size === events.length,
      'Duplicate events are not allowed'
    ),
  isActive: z.boolean().default(true),
  maxFailures: z.number().int().min(1).max(20).default(5),
  retryBackoff: z.number().int().min(10).max(3600).default(60),
});

/**
 * Schema for updating an existing webhook
 */
export const UpdateWebhookSchema = z.object({
  url: z
    .string()
    .url('Invalid webhook URL')
    .max(2048, 'URL too long')
    .optional(),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, 'At least one event is required')
    .refine(
      (events) => new Set(events).size === events.length,
      'Duplicate events are not allowed'
    )
    .optional(),
  isActive: z.boolean().optional(),
  maxFailures: z.number().int().min(1).max(20).optional(),
  retryBackoff: z.number().int().min(10).max(3600).optional(),
});

/**
 * Schema for testing a webhook
 */
export const TestWebhookSchema = z.object({
  eventType: z.enum(WEBHOOK_EVENTS),
  payload: z.record(z.any()).optional(),
});

/**
 * Schema for querying webhooks
 */
export const QueryWebhookSchema = z.object({
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  event: z.enum(WEBHOOK_EVENTS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Schema for querying webhook deliveries
 */
export const QueryWebhookDeliverySchema = z.object({
  webhookId: z.string().uuid('Invalid webhook ID').optional(),
  eventType: z.enum(WEBHOOK_EVENTS).optional(),
  status: z.enum(['success', 'failed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
export type TestWebhookInput = z.infer<typeof TestWebhookSchema>;
export type QueryWebhookParams = z.infer<typeof QueryWebhookSchema>;
export type QueryWebhookDeliveryParams = z.infer<
  typeof QueryWebhookDeliverySchema
>;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
