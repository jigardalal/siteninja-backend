import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantAccess } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { createdResponse, validationErrorResponse } from '@/utils/apiResponse';
import { uploadFile } from '@/services/upload.service';
import { logCreate } from '@/services/audit.service';

/**
 * POST /api/tenants/:tenantId/assets/upload
 * Upload a new asset (image or document)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId: params.tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const altText = formData.get('altText') as string | null;
    const category = formData.get('category') as string | null;

    if (!file) {
      return validationErrorResponse([
        { field: 'file', message: 'File is required' },
      ]);
    }

    // Upload file
    const uploadResult = await uploadFile(file, tenant.id, {
      generateThumbnail: true,
    });

    // Create asset record in database
    const asset = await prisma.asset.create({
      data: {
        tenantId: tenant.id,
        filename: uploadResult.filename,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        url: uploadResult.url,
        altText: altText || uploadResult.originalName,
        category: category || 'general',
        metadata: {
          width: uploadResult.width,
          height: uploadResult.height,
          thumbnail: uploadResult.thumbnail,
        },
      },
    });

    // Log audit
    await logCreate(auth.id, tenant.id, 'asset', asset.id, asset, request);

    return createdResponse(
      {
        id: asset.id,
        filename: asset.filename,
        url: asset.url,
        mimeType: asset.mimeType,
        size: asset.size,
        width: uploadResult.width,
        height: uploadResult.height,
        thumbnail: uploadResult.thumbnail,
        createdAt: asset.createdAt,
      },
      'Asset uploaded successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
