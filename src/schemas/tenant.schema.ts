import { z } from 'zod';

/**
 * Tenant Validation Schemas
 *
 * Zod schemas for validating tenant create/update operations
 * Based on Prisma schema: models/Tenant
 */

// Base schema with common validations
const tenantBaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  businessName: z.string().min(1, 'Business name is required').max(255, 'Business name must be less than 255 characters'),
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(63, 'Subdomain must be less than 63 characters')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.')
    .optional()
    .nullable(),
  customDomain: z
    .string()
    .max(255, 'Custom domain must be less than 255 characters')
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/,
      'Invalid domain format'
    )
    .optional()
    .nullable(),
  industry: z.string().max(100, 'Industry must be less than 100 characters').optional().nullable(),
  businessType: z
    .enum(['restaurant', 'retail', 'services', 'healthcare', 'education', 'nonprofit', 'other'])
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  contactEmail: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .nullable(),
  contactPhone: z
    .string()
    .max(20, 'Phone must be less than 20 characters')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone format')
    .optional()
    .nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100, 'City must be less than 100 characters').optional().nullable(),
  state: z.string().max(100, 'State must be less than 100 characters').optional().nullable(),
  postalCode: z.string().max(20, 'Postal code must be less than 20 characters').optional().nullable(),
  country: z.string().max(100, 'Country must be less than 100 characters').optional().nullable(),
  timezone: z.string().max(50, 'Timezone must be less than 50 characters').optional().nullable(),
  locale: z.string().max(10, 'Locale must be less than 10 characters').optional().nullable(),
  status: z.enum(['active', 'inactive', 'suspended', 'trial']).optional(),
  settings: z.record(z.any()).optional().nullable(),
});

/**
 * Schema for creating a new tenant
 *
 * Required fields:
 * - name: Display name of the tenant
 * - businessName: Legal business name
 *
 * Optional fields:
 * - subdomain: Unique subdomain (e.g., 'acme' for acme.siteninja.com)
 * - customDomain: Custom domain (e.g., 'www.acme.com')
 * - All other tenant fields
 *
 * Notes:
 * - tenantId will be auto-generated as UUID
 * - Either subdomain or customDomain should be provided
 * - Subdomain and customDomain uniqueness validated at database level
 */
export const CreateTenantSchema = tenantBaseSchema.extend({
  // Override to require at least one domain identifier
}).refine(
  (data) => data.subdomain || data.customDomain,
  {
    message: 'Either subdomain or customDomain must be provided',
    path: ['subdomain'],
  }
);

/**
 * Schema for updating an existing tenant
 *
 * All fields are optional for partial updates
 *
 * Restrictions:
 * - Cannot update tenantId (immutable)
 * - Subdomain and customDomain updates should be restricted or require verification
 */
export const UpdateTenantSchema = tenantBaseSchema.partial().extend({
  // Prevent updating critical fields
  subdomain: z.undefined().optional(),
  customDomain: z.undefined().optional(),
});

/**
 * Schema for tenant query parameters (list endpoint)
 */
export const TenantQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'businessName', 'status']).default('createdAt').optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'trial']).optional(),
  businessType: z.enum(['restaurant', 'retail', 'services', 'healthcare', 'education', 'nonprofit', 'other']).optional(),
  search: z.string().max(255).optional(),
  includeDeleted: z.coerce.boolean().default(false).optional(),
});

/**
 * Type exports for use in API handlers
 */
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>;
export type TenantQueryInput = z.infer<typeof TenantQuerySchema>;
