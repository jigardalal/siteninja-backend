import { z } from 'zod';

/**
 * Schema for creating a new template
 */
export const CreateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(255, 'Template name too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category too long'),
  industry: z.string().max(100, 'Industry name too long').optional(),
  previewImage: z.string().url('Invalid preview image URL').optional(),
  isPremium: z.boolean().default(false),
  isActive: z.boolean().default(true),
  defaultBranding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
    secondaryColor: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
    accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
    backgroundColor: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
    textColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
    fontFamily: z.string().min(1, 'Font family required'),
    headingFontFamily: z.string().min(1, 'Heading font family required'),
  }),
  defaultSections: z.array(
    z.object({
      type: z.string().min(1, 'Section type required'),
      content: z.any(),
      sortOrder: z.number().int().min(0).default(0),
    })
  ),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * Schema for updating an existing template
 */
export const UpdateTemplateSchema = CreateTemplateSchema.partial();

/**
 * Schema for applying a template to a page
 */
export const ApplyTemplateSchema = z.object({
  pageId: z.string().uuid('Invalid page ID format'),
  customizations: z
    .record(z.any())
    .optional()
    .describe('Custom overrides for template defaults'),
});

/**
 * Schema for querying templates
 */
export const QueryTemplateSchema = z.object({
  category: z.string().optional(),
  industry: z.string().optional(),
  isPremium: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof ApplyTemplateSchema>;
export type QueryTemplateParams = z.infer<typeof QueryTemplateSchema>;
