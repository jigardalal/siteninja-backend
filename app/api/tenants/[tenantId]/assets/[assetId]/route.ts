import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpdateAssetSchema } from '@/schemas/asset.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/assets/:assetId
 *
 * Get a single asset by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; assetId: string } }
) {
  try {
    const { tenantId, assetId } = await params;

    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!asset) {
      return notFoundResponse('Asset');
    }

    return successResponse(asset);
  } catch (error: any) {
    console.error('Error fetching asset:', error);
    return errorResponse('Failed to fetch asset: ' + error.message);
  }
}

/**
 * PUT /api/tenants/:tenantId/assets/:assetId
 *
 * Update asset metadata (altText, filename only)
 *
 * Cannot update the file itself - must delete and re-upload
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { tenantId: string; assetId: string } }
) {
  try {
    const { tenantId, assetId } = await params;
    const body = await request.json();

    // Validate request body
    const result = UpdateAssetSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check if asset exists
    const existing = await prisma.asset.findFirst({
      where: {
        id: assetId,
        tenantId,
      },
    });

    if (!existing) {
      return notFoundResponse('Asset');
    }

    // Update asset
    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return successResponse(asset, 'Asset updated successfully');
  } catch (error: any) {
    console.error('Error updating asset:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Asset');
      }
    }

    return errorResponse('Failed to update asset: ' + error.message);
  }
}

/**
 * DELETE /api/tenants/:tenantId/assets/:assetId
 *
 * Delete an asset
 *
 * NOTE: This is a placeholder implementation
 * TODO: Delete file from storage (S3/R2) in Phase 5
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; assetId: string } }
) {
  try {
    const { tenantId, assetId } = await params;

    // Check if asset exists
    const existing = await prisma.asset.findFirst({
      where: {
        id: assetId,
        tenantId,
      },
    });

    if (!existing) {
      return notFoundResponse('Asset');
    }

    // TODO: Delete file from S3/R2 storage in Phase 5
    // await deleteFromS3(existing.storageKey);

    // Delete asset record
    await prisma.asset.delete({
      where: { id: assetId },
    });

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting asset:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return notFoundResponse('Asset');
      }
    }

    return errorResponse('Failed to delete asset: ' + error.message);
  }
}
