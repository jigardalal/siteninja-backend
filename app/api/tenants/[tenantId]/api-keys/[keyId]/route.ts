import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { noContentResponse, notFoundResponse } from '@/utils/apiResponse';
import { deleteApiKey } from '@/services/apiKey.service';
import { logDelete } from '@/services/audit.service';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/tenants/:tenantId/api-keys/:keyId
 * Revoke (delete) an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tenantId: string; keyId: string } }
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
      return notFoundResponse('Tenant');
    }

    // Get API key for audit
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.keyId,
        tenantId: tenant.id,
      },
    });

    if (!apiKey) {
      return notFoundResponse('API key');
    }

    // Delete API key
    await deleteApiKey(params.keyId, tenant.id);

    // Log audit
    await logDelete(
      auth.id,
      tenant.id,
      'apiKey',
      params.keyId,
      {
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
      },
      request
    );

    return noContentResponse();
  } catch (error) {
    return handleApiError(error);
  }
}
