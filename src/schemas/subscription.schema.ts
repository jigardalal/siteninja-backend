import { z } from 'zod';

/**
 * Subscription Validation Schemas
 *
 * Zod schemas for validating subscription create/update operations
 * Based on Prisma schema: models/Subscription
 */

// Base schema with common validations
const subscriptionBaseSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
  status: z.enum(['active', 'inactive', 'trialing', 'past_due', 'canceled', 'unpaid']).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).optional(),
  amount: z.number().nonnegative('Amount must be non-negative').optional(),
  currency: z.string().length(3, 'Currency must be 3-letter code (e.g., USD)').toUpperCase().optional(),
  stripeCustomerId: z.string().max(255).optional().nullable(),
  stripeSubscriptionId: z.string().max(255).optional().nullable(),
  stripePriceId: z.string().max(255).optional().nullable(),
  currentPeriodStart: z.coerce.date().optional().nullable(),
  currentPeriodEnd: z.coerce.date().optional().nullable(),
  cancelAtPeriodEnd: z.boolean().default(false).optional(),
  trialStart: z.coerce.date().optional().nullable(),
  trialEnd: z.coerce.date().optional().nullable(),
});

/**
 * Schema for creating a new subscription
 *
 * Required fields:
 * - plan: Subscription plan tier
 *
 * Optional fields:
 * - status: Subscription status (default: 'trialing' if trial period)
 * - billingCycle: Monthly or yearly billing
 * - amount: Price amount in cents
 * - currency: Currency code (default: 'USD')
 * - Stripe-related fields (auto-populated by Stripe integration)
 * - Trial period dates
 *
 * Notes:
 * - id will be auto-generated as UUID
 * - tenantId will be extracted from the URL
 * - Stripe integration will populate Stripe-specific fields
 */
export const CreateSubscriptionSchema = subscriptionBaseSchema.extend({
  // Trial period helper fields
  trialDays: z.number().int().positive().max(90, 'Trial period cannot exceed 90 days').optional(),
});

/**
 * Schema for updating an existing subscription
 *
 * Common use cases:
 * - Upgrade/downgrade plan
 * - Change billing cycle
 * - Update payment method
 * - Set cancellation
 *
 * All fields are optional for partial updates
 */
export const UpdateSubscriptionSchema = subscriptionBaseSchema.partial().extend({
  // Allow setting cancellation at period end
  cancelAtPeriodEnd: z.boolean().optional(),
});

/**
 * Schema for canceling a subscription
 *
 * Options:
 * - immediately: Cancel immediately (default: false)
 * - If false, cancels at end of current period
 */
export const CancelSubscriptionSchema = z.object({
  immediately: z.boolean().default(false).optional(),
  reason: z.string().max(500, 'Cancellation reason must be less than 500 characters').optional(),
});

/**
 * Type exports for use in API handlers
 */
export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>;
