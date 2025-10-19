import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Upload configuration
 */
export const UploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedDocTypes: ['application/pdf'],
  uploadDir: path.join(process.cwd(), 'public', 'uploads'),
  thumbnailSize: { width: 300, height: 300 },
  maxImageDimensions: { width: 4000, height: 4000 },
};

/**
 * File upload result
 */
export interface UploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  width?: number;
  height?: number;
  thumbnail?: {
    filename: string;
    path: string;
    url: string;
  };
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(subDir?: string): Promise<string> {
  const dir = subDir
    ? path.join(UploadConfig.uploadDir, subDir)
    : UploadConfig.uploadDir;

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  return dir;
}

/**
 * Validate file type
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

/**
 * Upload image file with processing
 *
 * @param file - File object from FormData
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadImage(
  file: File,
  options: {
    tenantId: string;
    generateThumbnail?: boolean;
    maxWidth?: number;
    maxHeight?: number;
  }
): Promise<UploadResult> {
  const { tenantId, generateThumbnail = true, maxWidth, maxHeight } = options;

  // Validate file type
  if (!validateFileType(file.type, UploadConfig.allowedImageTypes)) {
    throw new Error(
      `Invalid file type. Allowed: ${UploadConfig.allowedImageTypes.join(', ')}`
    );
  }

  // Validate file size
  if (!validateFileSize(file.size, UploadConfig.maxFileSize)) {
    throw new Error(
      `File too large. Maximum size: ${UploadConfig.maxFileSize / 1024 / 1024}MB`
    );
  }

  // Ensure upload directory exists
  const uploadDir = await ensureUploadDir(tenantId);

  // Generate unique filename
  const filename = generateFilename(file.name);
  const filePath = path.join(uploadDir, filename);

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Process image with sharp
  let image = sharp(buffer);

  // Get metadata
  const metadata = await image.metadata();

  // Resize if image is too large
  const targetWidth = maxWidth || UploadConfig.maxImageDimensions.width;
  const targetHeight = maxHeight || UploadConfig.maxImageDimensions.height;

  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > targetWidth || metadata.height > targetHeight)
  ) {
    image = image.resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Optimize image
  image = image.jpeg({ quality: 85, progressive: true });

  // Save main image
  await image.toFile(filePath);

  // Get final metadata
  const finalMetadata = await sharp(filePath).metadata();

  // Generate thumbnail if requested
  let thumbnail: UploadResult['thumbnail'];

  if (generateThumbnail) {
    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailPath = path.join(uploadDir, thumbnailFilename);

    await sharp(buffer)
      .resize(UploadConfig.thumbnailSize.width, UploadConfig.thumbnailSize.height, {
        fit: 'cover',
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    thumbnail = {
      filename: thumbnailFilename,
      path: thumbnailPath,
      url: `/uploads/${tenantId}/${thumbnailFilename}`,
    };
  }

  return {
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    path: filePath,
    url: `/uploads/${tenantId}/${filename}`,
    width: finalMetadata.width,
    height: finalMetadata.height,
    thumbnail,
  };
}

/**
 * Upload document file (PDF, etc.)
 *
 * @param file - File object from FormData
 * @param tenantId - Tenant ID
 * @returns Upload result
 */
export async function uploadDocument(
  file: File,
  tenantId: string
): Promise<UploadResult> {
  // Validate file type
  if (!validateFileType(file.type, UploadConfig.allowedDocTypes)) {
    throw new Error(
      `Invalid file type. Allowed: ${UploadConfig.allowedDocTypes.join(', ')}`
    );
  }

  // Validate file size
  if (!validateFileSize(file.size, UploadConfig.maxFileSize)) {
    throw new Error(
      `File too large. Maximum size: ${UploadConfig.maxFileSize / 1024 / 1024}MB`
    );
  }

  // Ensure upload directory exists
  const uploadDir = await ensureUploadDir(tenantId);

  // Generate unique filename
  const filename = generateFilename(file.name);
  const filePath = path.join(uploadDir, filename);

  // Convert File to Buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);

  return {
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    path: filePath,
    url: `/uploads/${tenantId}/${filename}`,
  };
}

/**
 * Upload any file (image or document)
 *
 * @param file - File object from FormData
 * @param tenantId - Tenant ID
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadFile(
  file: File,
  tenantId: string,
  options?: {
    generateThumbnail?: boolean;
    maxWidth?: number;
    maxHeight?: number;
  }
): Promise<UploadResult> {
  // Determine if file is an image
  const isImage = UploadConfig.allowedImageTypes.includes(file.type);

  if (isImage) {
    return uploadImage(file, { tenantId, ...options });
  } else {
    return uploadDocument(file, tenantId);
  }
}

/**
 * Delete uploaded file
 *
 * @param filePath - Path to file
 */
export async function deleteFile(filePath: string): Promise<void> {
  const fs = require('fs/promises');

  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('[Upload] Error deleting file:', error);
    // Don't throw - file might already be deleted
  }
}

/**
 * Get file info without uploading
 *
 * @param file - File object
 * @returns File information
 */
export async function getFileInfo(file: File): Promise<{
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  isDocument: boolean;
  isValid: boolean;
  error?: string;
}> {
  const isImage = UploadConfig.allowedImageTypes.includes(file.type);
  const isDocument = UploadConfig.allowedDocTypes.includes(file.type);
  const isValid = isImage || isDocument;

  let error: string | undefined;

  if (!isValid) {
    error = 'Invalid file type';
  } else if (file.size > UploadConfig.maxFileSize) {
    error = 'File too large';
  }

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    isImage,
    isDocument,
    isValid: isValid && !error,
    error,
  };
}
