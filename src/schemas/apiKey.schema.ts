import { z } from 'zod';

/**
 * List of allowed API key permissions
 */
export const API_KEY_PERMISSIONS = [
  'read:pages',
  'write:pages',
  'delete:pages',
  'read:sections',
  'write:sections',
  'delete:sections',
  'read:branding',
  'write:branding',
  'read:navigation',
  'write:navigation',
  'delete:navigation',
  'read:seo',
  'write:seo',
  'read:assets',
  'write:assets',
  'delete:assets',
  'read:users',
  'write:users',
  'delete:users',
  'read:webhooks',
  'write:webhooks',
  'delete:webhooks',
  'admin:all',
] as const;

/**
 * Schema for creating a new API key
 */
export const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(255, 'Name too long')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),
  permissions: z
    .array(z.enum(API_KEY_PERMISSIONS))
    .min(1, 'At least one permission is required')
    .refine(
      (perms) => new Set(perms).size === perms.length,
      'Duplicate permissions are not allowed'
    ),
  rateLimit: z
    .number()
    .int()
    .min(10, 'Minimum rate limit is 10 requests/hour')
    .max(10000, 'Maximum rate limit is 10,000 requests/hour')
    .default(1000),
  expiresAt: z
    .string()
    .datetime()
    .transform((str) => new Date(str))
    .refine((date) => date > new Date(), 'Expiration date must be in the future')
    .optional(),
});

/**
 * Schema for updating an existing API key
 */
export const UpdateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(255, 'Name too long')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .optional(),
  permissions: z
    .array(z.enum(API_KEY_PERMISSIONS))
    .min(1, 'At least one permission is required')
    .refine(
      (perms) => new Set(perms).size === perms.length,
      'Duplicate permissions are not allowed'
    )
    .optional(),
  rateLimit: z
    .number()
    .int()
    .min(10, 'Minimum rate limit is 10 requests/hour')
    .max(10000, 'Maximum rate limit is 10,000 requests/hour')
    .optional(),
  isActive: z.boolean().optional(),
  expiresAt: z
    .string()
    .datetime()
    .transform((str) => new Date(str))
    .refine((date) => date > new Date(), 'Expiration date must be in the future')
    .optional(),
});

/**
 * Schema for querying API keys
 */
export const QueryApiKeySchema = z.object({
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Schema for querying API key usage statistics
 */
export const QueryApiKeyUsageSchema = z.object({
  startDate: z
    .string()
    .datetime()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .datetime()
    .transform((str) => new Date(str))
    .optional(),
  endpoint: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeySchema>;
export type QueryApiKeyParams = z.infer<typeof QueryApiKeySchema>;
export type QueryApiKeyUsageParams = z.infer<typeof QueryApiKeyUsageSchema>;
export type ApiKeyPermission = (typeof API_KEY_PERMISSIONS)[number];
