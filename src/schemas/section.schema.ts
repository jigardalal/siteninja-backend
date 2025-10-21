import { z } from 'zod';

/**
 * Section Validation Schemas
 *
 * Zod schemas for validating section create/update operations
 * Based on Prisma schema: models/Section
 */

// Base schema with common validations
const sectionBaseSchema = z.object({
  sectionId: z
    .string()
    .min(1, 'Section ID is required')
    .max(100, 'Section ID must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Section ID must contain only letters, numbers, underscores, and hyphens'),
  type: z
    .string()
    .min(1, 'Section type is required')
    .max(50, 'Section type must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Section type must contain only letters, numbers, underscores, and hyphens'),
  content: z.any(),
  sortOrder: z.number().int().nonnegative('Sort order must be a non-negative integer').optional(),
});

/**
 * Schema for creating a new section
 *
 * Required fields:
 * - sectionId: Unique identifier within the page (e.g., 'hero', 'about-us')
 * - type: Section type (e.g., 'hero', 'text', 'gallery', 'contact-form')
 * - content: JSONB content (structure varies by type)
 *
 * Optional fields:
 * - sortOrder: Display order (auto-incremented if not provided)
 *
 * Notes:
 * - id will be auto-generated as UUID
 * - pageId will be extracted from the URL
 * - sectionId uniqueness validated per page at database level
 */
export const CreateSectionSchema = sectionBaseSchema;

/**
 * Schema for updating an existing section
 *
 * All fields except sectionId are optional for partial updates
 *
 * Restrictions:
 * - Cannot update sectionId (use it as identifier)
 * - Cannot update pageId (immutable)
 */
export const UpdateSectionSchema = z.object({
  type: z
    .string()
    .min(1, 'Section type is required')
    .max(50, 'Section type must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Section type must contain only letters, numbers, underscores, and hyphens')
    .optional(),
  content: z.any().optional(),
  sortOrder: z.number().int().nonnegative('Sort order must be a non-negative integer').optional(),
});

/**
 * Schema for reordering sections
 *
 * Array of section IDs in the desired order
 * Each section will be assigned a sortOrder based on its position
 */
export const ReorderSectionsSchema = z.object({
  sectionIds: z
    .array(z.string().uuid('Invalid section UUID'))
    .min(1, 'At least one section ID is required')
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Section IDs must be unique',
    }),
});

/**
 * Schema for bulk updating sections
 *
 * Array of section updates, each with an id and partial update data
 */
export const BulkUpdateSectionsSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid('Invalid section UUID'),
        type: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
        content: z.any().optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      })
    )
    .min(1, 'At least one update is required')
    .max(50, 'Cannot update more than 50 sections at once')
    .refine(
      (updates) => {
        const ids = updates.map((u) => u.id);
        return new Set(ids).size === ids.length;
      },
      {
        message: 'Section IDs must be unique',
      }
    ),
});

/**
 * Schema for section query parameters (list endpoint)
 */
export const SectionQuerySchema = z.object({
  type: z.string().max(50).optional(),
  sort: z.enum(['sortOrder', 'createdAt', 'updatedAt']).default('sortOrder').optional(),
  order: z.enum(['asc', 'desc']).default('asc').optional(),
});

/**
 * Type exports for use in API handlers
 */
export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;
export type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;
export type ReorderSectionsInput = z.infer<typeof ReorderSectionsSchema>;
export type BulkUpdateSectionsInput = z.infer<typeof BulkUpdateSectionsSchema>;
export type SectionQueryInput = z.infer<typeof SectionQuerySchema>;
