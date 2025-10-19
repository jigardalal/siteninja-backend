import { z } from 'zod';

/**
 * Asset Validation Schemas
 *
 * Zod schemas for validating asset upload/update operations
 * Based on Prisma schema: models/Asset
 */

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
] as const;

// Maximum file size (10MB in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Base schema with common validations
const assetBaseSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters'),
  altText: z.string().max(255, 'Alt text must be less than 255 characters').optional().nullable(),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}` }),
  }),
  fileSize: z.number().int().positive('File size must be positive').max(MAX_FILE_SIZE, `File size cannot exceed ${MAX_FILE_SIZE / 1024 / 1024}MB`),
  storageKey: z.string().min(1, 'Storage key is required').max(500, 'Storage key must be less than 500 characters'),
  storageUrl: z.string().url('Invalid URL format').max(1000, 'Storage URL must be less than 1000 characters'),
  width: z.number().int().positive('Width must be positive').optional().nullable(),
  height: z.number().int().positive('Height must be positive').optional().nullable(),
});

/**
 * Schema for creating a new asset (after upload)
 *
 * Required fields:
 * - filename: Original filename
 * - mimeType: File MIME type
 * - fileSize: File size in bytes
 * - storageKey: Unique key in storage (S3/R2)
 * - storageUrl: Public URL to access the file
 *
 * Optional fields:
 * - altText: Alt text for images (accessibility)
 * - width, height: Image dimensions
 *
 * Notes:
 * - id will be auto-generated as UUID
 * - tenantId will be extracted from the URL
 * - uploadedBy will be set from authenticated user (Phase 4)
 * - File validation happens before creating this record
 */
export const CreateAssetSchema = assetBaseSchema;

/**
 * Schema for updating an existing asset
 *
 * Only metadata can be updated, not the file itself
 *
 * Allowed updates:
 * - altText: Update alt text
 * - filename: Rename file (display name only, not storage key)
 *
 * Restrictions:
 * - Cannot update file itself (must delete and re-upload)
 * - Cannot update mimeType, fileSize, storageKey, storageUrl
 */
export const UpdateAssetSchema = z.object({
  altText: z.string().max(255).optional().nullable(),
  filename: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .optional(),
});

/**
 * Schema for asset query parameters (list endpoint)
 */
export const AssetQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'filename', 'fileSize']).default('createdAt').optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
  mimeType: z.enum(ALLOWED_MIME_TYPES).optional(),
  search: z.string().max(255).optional(),
});

/**
 * Schema for file upload validation (multipart/form-data)
 *
 * This schema validates the uploaded file metadata
 */
export const FileUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File || (file && typeof file === 'object' && 'size' in file), {
    message: 'File is required',
  }),
  altText: z.string().max(255).optional(),
});

/**
 * Type exports for use in API handlers
 */
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
export type AssetQueryInput = z.infer<typeof AssetQuerySchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;

/**
 * Export allowed MIME types and max file size for use in handlers
 */
export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE };
