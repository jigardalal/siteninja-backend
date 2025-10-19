import { z } from 'zod';

/**
 * Navigation Validation Schemas
 *
 * Zod schemas for validating navigation create/update operations
 * Based on Prisma schema: models/Navigation
 */

// Base schema with common validations
const navigationBaseSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label must be less than 100 characters'),
  path: z
    .string()
    .max(255, 'Path must be less than 255 characters')
    .regex(/^\/.*$/, 'Path must start with /')
    .optional()
    .nullable(),
  pageId: z.string().uuid('Invalid page ID').optional().nullable(),
  isVisible: z.boolean().default(true).optional(),
  sortOrder: z.number().int().nonnegative('Sort order must be a non-negative integer').optional(),
  openInNewTab: z.boolean().default(false).optional(),
});

/**
 * Schema for creating a new navigation item
 *
 * Required fields:
 * - label: Display text for the navigation item
 *
 * Optional fields:
 * - path: External URL path (e.g., '/about', 'https://external.com')
 * - pageId: Reference to an internal page (mutually exclusive with path)
 * - isVisible: Whether to display in navigation (default: true)
 * - sortOrder: Display order (auto-incremented if not provided)
 * - openInNewTab: Whether to open link in new tab
 *
 * Notes:
 * - id will be auto-generated as UUID
 * - tenantId will be extracted from the URL
 * - Either path or pageId should be provided
 */
export const CreateNavigationSchema = navigationBaseSchema.refine(
  (data) => data.path || data.pageId,
  {
    message: 'Either path or pageId must be provided',
    path: ['path'],
  }
);

/**
 * Schema for updating an existing navigation item
 *
 * All fields are optional for partial updates
 */
export const UpdateNavigationSchema = navigationBaseSchema.partial().strict();

/**
 * Schema for reordering navigation items
 *
 * Array of navigation IDs in the desired order
 */
export const ReorderNavigationSchema = z.object({
  navigationIds: z
    .array(z.string().uuid('Invalid navigation UUID'))
    .min(1, 'At least one navigation ID is required')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Navigation IDs must be unique',
    }),
});

/**
 * Schema for navigation query parameters (list endpoint)
 */
export const NavigationQuerySchema = z.object({
  isVisible: z.coerce.boolean().optional(),
  sort: z.enum(['sortOrder', 'label', 'createdAt']).default('sortOrder').optional(),
  order: z.enum(['asc', 'desc']).default('asc').optional(),
});

/**
 * Type exports for use in API handlers
 */
export type CreateNavigationInput = z.infer<typeof CreateNavigationSchema>;
export type UpdateNavigationInput = z.infer<typeof UpdateNavigationSchema>;
export type ReorderNavigationInput = z.infer<typeof ReorderNavigationSchema>;
export type NavigationQueryInput = z.infer<typeof NavigationQuerySchema>;
