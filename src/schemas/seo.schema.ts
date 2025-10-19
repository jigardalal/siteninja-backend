import { z } from 'zod';

/**
 * SEO Metadata Validation Schemas
 *
 * Zod schemas for validating SEO metadata create/update operations
 * Based on Prisma schema: models/SeoMetadata
 */

// Base schema with common validations
const seoBaseSchema = z.object({
  metaTitle: z
    .string()
    .min(1, 'Meta title is required')
    .max(70, 'Meta title should be less than 70 characters for optimal SEO')
    .optional()
    .nullable(),
  metaDescription: z
    .string()
    .max(160, 'Meta description should be less than 160 characters for optimal SEO')
    .optional()
    .nullable(),
  keywords: z.string().max(255, 'Keywords must be less than 255 characters').optional().nullable(),
  canonicalUrl: z
    .string()
    .url('Invalid URL format')
    .max(255, 'Canonical URL must be less than 255 characters')
    .optional()
    .nullable(),
  ogTitle: z.string().max(70, 'OG title should be less than 70 characters').optional().nullable(),
  ogDescription: z.string().max(160, 'OG description should be less than 160 characters').optional().nullable(),
  ogImage: z.string().url('Invalid URL format').max(255).optional().nullable(),
  twitterCard: z.enum(['summary', 'summary_large_image', 'app', 'player']).optional().nullable(),
  twitterTitle: z.string().max(70, 'Twitter title should be less than 70 characters').optional().nullable(),
  twitterDescription: z.string().max(160, 'Twitter description should be less than 160 characters').optional().nullable(),
  twitterImage: z.string().url('Invalid URL format').max(255).optional().nullable(),
  schemaMarkup: z.record(z.any(), 'Schema markup must be a valid JSON object').optional().nullable(),
  robots: z.string().max(100, 'Robots directive must be less than 100 characters').optional().nullable(),
});

/**
 * Schema for creating/updating SEO metadata (upsert operation)
 *
 * All fields are optional - upsert creates if doesn't exist, updates if exists
 *
 * Common fields:
 * - metaTitle: Page title for search engines
 * - metaDescription: Page description for search results
 * - keywords: Comma-separated keywords
 * - canonicalUrl: Canonical URL to prevent duplicate content
 *
 * Open Graph fields (Facebook, LinkedIn):
 * - ogTitle, ogDescription, ogImage
 *
 * Twitter Card fields:
 * - twitterCard: Card type
 * - twitterTitle, twitterDescription, twitterImage
 *
 * Advanced:
 * - schemaMarkup: Structured data (JSON-LD)
 * - robots: robots meta tag directive (e.g., 'noindex, nofollow')
 */
export const UpsertSeoMetadataSchema = seoBaseSchema;

/**
 * Type exports for use in API handlers
 */
export type UpsertSeoMetadataInput = z.infer<typeof UpsertSeoMetadataSchema>;
