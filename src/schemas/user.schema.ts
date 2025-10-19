import { z } from 'zod';

/**
 * User Validation Schemas
 *
 * Zod schemas for validating user create/update operations
 * Based on Prisma schema: models/User
 */

// Password strength validator
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Base schema with common validations
const userBaseSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email must be less than 255 characters'),
  firstName: z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters').optional().nullable(),
  lastName: z.string().max(100, 'Last name must be less than 100 characters').optional().nullable(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']).default('editor').optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active').optional(),
  avatar: z.string().url('Invalid URL format').max(500, 'Avatar URL must be less than 500 characters').optional().nullable(),
  phone: z
    .string()
    .max(20, 'Phone must be less than 20 characters')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone format')
    .optional()
    .nullable(),
});

/**
 * Schema for creating a new user
 *
 * Required fields:
 * - email: User's email address (unique)
 * - password: User's password (will be hashed)
 * - tenantId: Tenant association
 *
 * Optional fields:
 * - firstName, lastName: User's name
 * - role: User role (default: 'editor')
 * - status: Account status (default: 'active')
 * - avatar: Profile picture URL
 * - phone: Contact phone number
 *
 * Notes:
 * - id will be auto-generated as UUID
 * - passwordHash will be created from password
 * - Email uniqueness validated at database level
 */
export const CreateUserSchema = userBaseSchema.extend({
  password: passwordSchema,
  tenantId: z.string().uuid('Invalid tenant ID'),
});

/**
 * Schema for updating an existing user
 *
 * All fields are optional for partial updates
 *
 * Restrictions:
 * - Cannot update password (use separate endpoint)
 * - Cannot update email (use separate endpoint or recreate user)
 * - Cannot update tenantId (immutable)
 */
export const UpdateUserSchema = userBaseSchema.partial().extend({
  // Prevent updating critical fields
  email: z.undefined().optional(),
});

/**
 * Schema for changing user password
 *
 * Required fields:
 * - currentPassword: User's current password for verification
 * - newPassword: New password (must meet strength requirements)
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password must match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * Schema for user query parameters (list endpoint)
 */
export const UserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'email', 'firstName', 'lastName']).default('createdAt').optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
  tenantId: z.string().uuid().optional(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  search: z.string().max(255).optional(),
});

/**
 * Type exports for use in API handlers
 */
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;
