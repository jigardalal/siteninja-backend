import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  paginatedResponse,
} from '@/utils/apiResponse';
import { parsePaginationParams, calculateSkip, buildPrismaOrderBy } from '@/utils/pagination';
import { CreateAssetSchema, AssetQuerySchema } from '@/schemas/asset.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/assets
 *
 * List all assets for a tenant with pagination and filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const { searchParams } = new URL(request.url);

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Parse and validate query parameters
    const queryResult = AssetQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return validationErrorResponse(
        queryResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { page, limit, sort, order, mimeType, search } = queryResult.data;

    // Build where clause
    const where: Prisma.AssetWhereInput = {
      tenantId,
      ...(mimeType && { mimeType }),
      ...(search && {
        OR: [
          { filename: { contains: search, mode: 'insensitive' } },
          { altText: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Execute query with pagination
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip: calculateSkip(page!, limit!),
        take: limit,
        orderBy: buildPrismaOrderBy(sort!, order!),
        include: {
          uploadedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return paginatedResponse(assets, page!, limit!, total);
  } catch (error: any) {
    console.error('Error listing assets:', error);
    return errorResponse('Failed to list assets: ' + error.message);
  }
}

/**
 * POST /api/tenants/:tenantId/assets
 *
 * Upload a new asset
 *
 * NOTE: This is a placeholder implementation for file metadata storage
 * TODO: Implement actual file upload handling with multipart/form-data in Phase 5
 * TODO: Integrate with cloud storage (S3/R2) in Phase 5
 *
 * For now, accepts file metadata directly in JSON format
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;
    const body = await request.json();

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Validate request body
    const result = CreateAssetSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Create asset record
    // TODO: Upload file to S3/R2 and get storageKey/storageUrl in Phase 5
    // TODO: Extract image dimensions using sharp in Phase 5
    // TODO: Set uploadedById from authenticated user in Phase 4
    const asset = await prisma.asset.create({
      data: {
        ...data,
        tenantId,
        // uploadedById: Will be set from auth context in Phase 4
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return createdResponse(asset, 'Asset uploaded successfully');
  } catch (error: any) {
    console.error('Error uploading asset:', error);
    return errorResponse('Failed to upload asset: ' + error.message);
  }
}
