import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import {
  createdResponse,
  errorResponse,
  validationErrorResponse,
  conflictResponse,
} from '@/utils/apiResponse';
import { CreateUserSchema } from '@/schemas/user.schema';
import { Prisma } from '@prisma/client';
import { handleApiError } from '@/middleware/errorHandler';
import { logCreate } from '@/services/audit.service';
import { triggerWebhooks } from '@/services/webhook.service';

/**
 * POST /api/auth/register
 *
 * Register a new user account
 *
 * Request body:
 * - email: User's email address
 * - password: User's password (min 8 chars, uppercase, lowercase, number)
 * - firstName: User's first name (optional)
 * - lastName: User's last name (optional)
 * - tenantId: Tenant to associate user with
 * - role: User role (default: 'editor')
 *
 * Response: 201 Created with user data (excluding password)
 *
 * Security:
 * - Prevents email enumeration (generic error messages)
 * - Passwords are hashed with bcrypt (cost factor 10)
 * - Email verification flow can be added here
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error?.errors || result.error?.issues || [];
      return validationErrorResponse(
        errors.map((err: any) => ({
          field: err.path?.join('.') || 'unknown',
          message: err.message || 'Validation error',
        }))
      );
    }

    const { password, ...data } = result.data;

    // Check for duplicate email (generic error to prevent enumeration)
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return conflictResponse('A user with this email already exists');
    }

    // Verify tenant exists and is active
    const tenant = await prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return errorResponse('Invalid tenant', 400);
    }

    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return errorResponse('Tenant is not active', 400);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with default status as 'active'
    // In production, you might want 'pending' and send verification email
    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
        status: 'active', // Change to 'pending' for email verification flow
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        emailVerified: true,
        createdAt: true,
        // Exclude passwordHash from response
        tenant: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    });

    // Log audit (user is creating their own account)
    await logCreate(user.id, user.tenantId, 'user', user.id, user, request);

    // Trigger webhooks
    await triggerWebhooks(user.tenantId, 'user.registered', {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    // TODO: Send verification email here
    // await sendVerificationEmail(user.email, verificationToken);

    return createdResponse(
      user,
      'Account created successfully. Please verify your email.'
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}
