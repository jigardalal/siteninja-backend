import { z } from 'zod';

/**
 * Page Validation Schemas
 *
 * Zod schemas for validating page create/update operations
 * Based on Prisma schema: models/Page
 */

// Base schema with common validations
const pageBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.'),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft').optional(),
  templateId: z.string().uuid('Invalid template ID').optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
});

/**
 * Schema for creating a new page
 *
 * Required fields:
 * - title: Page title
 * - slug: URL-friendly identifier (unique per tenant)
 *
 * Optional fields:
 * - description: Page description
 * - status: Publication status (defaults to 'draft')
 * - templateId: Reference to a page template
 * - settings: Additional page configuration
 * - sections: Array of sections to create with the page
 *
 * Notes:
 * - id will be auto-generated as UUID
 * - tenantId will be extracted from the URL
 * - Slug uniqueness validated per tenant at database level
 */
export const CreatePageSchema = pageBaseSchema.extend({
  sections: z
    .array(
      z.object({
        sectionId: z.string().min(1, 'Section ID is required').max(100, 'Section ID must be less than 100 characters'),
        type: z.string().min(1, 'Section type is required').max(50, 'Section type must be less than 50 characters'),
        content: z.record(z.any()),
        sortOrder: z.number().int().nonnegative().optional(),
      })
    )
    .optional(),
});

/**
 * Schema for updating an existing page
 *
 * All fields are optional for partial updates
 *
 * Restrictions:
 * - Cannot update slug (immutable after creation)
 * - Cannot update tenantId (immutable)
 */
export const UpdatePageSchema = pageBaseSchema
  .partial()
  .extend({
    // Prevent updating immutable fields
    slug: z.undefined().optional(),
  })
  .strict();

/**
 * Schema for duplicating a page
 *
 * Required fields:
 * - newSlug: Slug for the duplicated page
 * - newTitle: Title for the duplicated page (optional, defaults to "Copy of {original title}")
 */
export const DuplicatePageSchema = z.object({
  newSlug: z
    .string()
    .min(1, 'New slug is required')
    .max(255, 'New slug must be less than 255 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  newTitle: z.string().min(1).max(255).optional(),
  copySettings: z.boolean().default(true).optional(),
  copySections: z.boolean().default(true).optional(),
  copySeo: z.boolean().default(true).optional(),
});

/**
 * Schema for page query parameters (list endpoint)
 */
export const PageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'title', 'slug', 'status']).default('createdAt').optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().max(255).optional(),
  templateId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().default(false).optional(),
});

/**
 * Schema for page includes (related data to fetch)
 */
export const PageIncludeSchema = z.object({
  sections: z.coerce.boolean().default(false).optional(),
  seo: z.coerce.boolean().default(false).optional(),
  navigation: z.coerce.boolean().default(false).optional(),
  template: z.coerce.boolean().default(false).optional(),
});

/**
 * Type exports for use in API handlers
 */
export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
export type DuplicatePageInput = z.infer<typeof DuplicatePageSchema>;
export type PageQueryInput = z.infer<typeof PageQuerySchema>;
export type PageIncludeInput = z.infer<typeof PageIncludeSchema>;
