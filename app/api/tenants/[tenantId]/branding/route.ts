import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} from '@/utils/apiResponse';
import { UpsertBrandingSchema } from '@/schemas/branding.schema';

/**
 * GET /api/tenants/:tenantId/branding
 *
 * Get branding for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Fetch branding
    const branding = await prisma.branding.findUnique({
      where: { tenantId },
    });

    if (!branding) {
      return notFoundResponse('Branding');
    }

    return successResponse(branding);
  } catch (error: any) {
    console.error('Error fetching branding:', error);
    return errorResponse('Failed to fetch branding: ' + error.message);
  }
}

/**
 * PUT /api/tenants/:tenantId/branding
 *
 * Create or update branding (upsert operation)
 */
export async function PUT(
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
    const result = UpsertBrandingSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Upsert branding
    const branding = await prisma.branding.upsert({
      where: { tenantId },
      create: {
        ...data,
        tenantId,
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return successResponse(branding, 'Branding saved successfully');
  } catch (error: any) {
    console.error('Error saving branding:', error);
    return errorResponse('Failed to save branding: ' + error.message);
  }
}

/**
 * DELETE /api/tenants/:tenantId/branding
 *
 * Reset branding to default values (instead of deleting)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = params;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Reset to default branding values
    const branding = await prisma.branding.upsert({
      where: { tenantId },
      create: {
        tenantId,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFont: 'Inter, system-ui, sans-serif',
      },
      update: {
        logoUrl: null,
        faviconUrl: null,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        fontFamily: 'Inter, system-ui, sans-serif',
        headingFont: 'Inter, system-ui, sans-serif',
        customCss: null,
        customJs: null,
        updatedAt: new Date(),
      },
    });

    return successResponse(branding, 'Branding reset to defaults');
  } catch (error: any) {
    console.error('Error resetting branding:', error);
    return errorResponse('Failed to reset branding: ' + error.message);
  }
}
