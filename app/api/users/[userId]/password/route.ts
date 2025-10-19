import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { ChangePasswordSchema } from '@/schemas/user.schema';
import { requireAuth } from '@/middleware/auth';

/**
 * PUT /api/users/:userId/password
 *
 * Change user password
 *
 * Request body:
 * - currentPassword: User's current password for verification
 * - newPassword: New password (must meet strength requirements)
 * - confirmPassword: Confirmation of new password
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Require authentication - users can only change their own password
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId } = params;

    // Users can only change their own password
    if (authResult.id !== userId) {
      return errorResponse('You can only change your own password', 403);
    }

    const body = await request.json();

    // Validate request body
    const result = ChangePasswordSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return notFoundResponse('User');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse('Current password is incorrect', 401);
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    return successResponse({ success: true }, 'Password changed successfully');
  } catch (error: any) {
    console.error('Error changing password:', error);
    return errorResponse('Failed to change password: ' + error.message);
  }
}
