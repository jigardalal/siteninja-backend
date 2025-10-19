import { z } from 'zod';

/**
 * Branding Validation Schemas
 *
 * Zod schemas for validating branding create/update operations
 * Based on Prisma schema: models/Branding
 */

// Hex color regex validator
const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format (e.g., #FF5733 or #F57)');

// Base schema with common validations
const brandingBaseSchema = z.object({
  logoUrl: z.string().url('Invalid URL format').max(500, 'Logo URL must be less than 500 characters').optional().nullable(),
  faviconUrl: z.string().url('Invalid URL format').max(500, 'Favicon URL must be less than 500 characters').optional().nullable(),
  primaryColor: hexColorSchema.optional().nullable(),
  secondaryColor: hexColorSchema.optional().nullable(),
  accentColor: hexColorSchema.optional().nullable(),
  backgroundColor: hexColorSchema.optional().nullable(),
  textColor: hexColorSchema.optional().nullable(),
  fontFamily: z.string().max(100, 'Font family must be less than 100 characters').optional().nullable(),
  headingFont: z.string().max(100, 'Heading font must be less than 100 characters').optional().nullable(),
  customCss: z.string().optional().nullable(),
  customJs: z.string().optional().nullable(),
});

/**
 * Schema for creating/updating branding (upsert operation)
 *
 * All fields are optional - upsert creates if doesn't exist, updates if exists
 *
 * Visual assets:
 * - logoUrl: Main logo URL
 * - faviconUrl: Browser favicon URL
 *
 * Color scheme (hex colors):
 * - primaryColor: Main brand color
 * - secondaryColor: Secondary brand color
 * - accentColor: Accent/highlight color
 * - backgroundColor: Background color
 * - textColor: Default text color
 *
 * Typography:
 * - fontFamily: Body text font
 * - headingFont: Heading font
 *
 * Advanced customization:
 * - customCss: Custom CSS styles
 * - customJs: Custom JavaScript code
 *
 * Notes:
 * - Color values must be valid hex colors (e.g., #FF5733)
 * - URLs must be valid absolute URLs
 * - Custom CSS/JS should be sanitized on the frontend
 */
export const UpsertBrandingSchema = brandingBaseSchema;

/**
 * Type exports for use in API handlers
 */
export type UpsertBrandingInput = z.infer<typeof UpsertBrandingSchema>;
