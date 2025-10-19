import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { CreateSubscriptionSchema, UpdateSubscriptionSchema, CancelSubscriptionSchema } from '@/schemas/subscription.schema';

/**
 * GET /api/tenants/:tenantId/subscription
 *
 * Get subscription for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Fetch subscription
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!subscription) {
      return notFoundResponse('Subscription');
    }

    return successResponse(subscription);
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return errorResponse('Failed to fetch subscription: ' + error.message);
  }
}

/**
 * POST /api/tenants/:tenantId/subscription
 *
 * Create a new subscription for a tenant
 *
 * NOTE: This is a placeholder implementation
 * TODO: Integrate with Stripe API in Phase 5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const body = await request.json();

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Check if subscription already exists
    const existing = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return errorResponse('Subscription already exists for this tenant', 409);
    }

    // Validate request body
    const result = CreateSubscriptionSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { trialDays, ...data } = result.data;

    // Calculate trial period if trialDays provided
    let trialStart = data.trialStart;
    let trialEnd = data.trialEnd;
    let status = data.status || 'active';

    if (trialDays) {
      trialStart = new Date();
      trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      status = 'trialing';
    }

    // Create subscription
    // TODO: Create Stripe customer and subscription in Phase 5
    const subscription = await prisma.subscription.create({
      data: {
        ...data,
        tenantId,
        status,
        trialStart,
        trialEnd,
      },
    });

    return createdResponse(subscription, 'Subscription created successfully');
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return errorResponse('Failed to create subscription: ' + error.message);
  }
}

/**
 * PUT /api/tenants/:tenantId/subscription
 *
 * Update an existing subscription
 *
 * NOTE: This is a placeholder implementation
 * TODO: Update Stripe subscription in Phase 5
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const body = await request.json();

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Validate request body
    const result = UpdateSubscriptionSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check if subscription exists
    const existing = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      return notFoundResponse('Subscription');
    }

    // Update subscription
    // TODO: Update Stripe subscription in Phase 5
    const subscription = await prisma.subscription.update({
      where: { tenantId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return successResponse(subscription, 'Subscription updated successfully');
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return errorResponse('Failed to update subscription: ' + error.message);
  }
}

/**
 * DELETE /api/tenants/:tenantId/subscription
 *
 * Cancel a subscription
 *
 * NOTE: This is a placeholder implementation
 * TODO: Cancel Stripe subscription in Phase 5
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const body = await request.json().catch(() => ({}));

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Validate request body
    const result = CancelSubscriptionSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { immediately, reason } = result.data;

    // Check if subscription exists
    const existing = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (!existing) {
      return notFoundResponse('Subscription');
    }

    if (immediately) {
      // Cancel immediately
      // TODO: Cancel Stripe subscription immediately in Phase 5
      const subscription = await prisma.subscription.update({
        where: { tenantId },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return successResponse(subscription, 'Subscription canceled immediately');
    } else {
      // Cancel at period end
      // TODO: Update Stripe subscription to cancel at period end in Phase 5
      const subscription = await prisma.subscription.update({
        where: { tenantId },
        data: {
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        },
      });
      return successResponse(subscription, 'Subscription will be canceled at period end');
    }
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    return errorResponse('Failed to cancel subscription: ' + error.message);
  }
}
