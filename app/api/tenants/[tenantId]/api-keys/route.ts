import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/middleware/auth';
import { validateBody, validateQuery } from '@/middleware/validate';
import { handleApiError } from '@/middleware/errorHandler';
import { createdResponse, paginatedResponse } from '@/utils/apiResponse';
import { CreateApiKeySchema, QueryApiKeySchema } from '@/schemas/apiKey.schema';
import { generateApiKey, listApiKeys } from '@/services/apiKey.service';
import { logCreate } from '@/services/audit.service';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tenants/:tenantId/api-keys
 * List API keys for a tenant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Validate query parameters
    const query = validateQuery(request, QueryApiKeySchema);
    if (query instanceof NextResponse) return query;

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

    // List API keys
    const result = await listApiKeys(tenant.id, {
      isActive: query.isActive,
      page: query.page,
      limit: query.limit,
    });

    return paginatedResponse(result.keys, result.page, query.limit, result.total);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/tenants/:tenantId/api-keys
 * Create a new API key
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Authenticate and authorize
    const auth = await requireTenantAccess(request, params.tenantId);
    if (auth instanceof NextResponse) return auth;

    // Validate request body
    const body = await validateBody(request, CreateApiKeySchema);
    if (body instanceof NextResponse) return body;

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

    // Generate API key
    const apiKey = await generateApiKey(
      tenant.id,
      body.name,
      body.permissions,
      auth.id,
      {
        rateLimit: body.rateLimit,
        expiresAt: body.expiresAt,
      }
    );

    // Log audit (without the key)
    await logCreate(
      auth.id,
      tenant.id,
      'apiKey',
      apiKey.id,
      {
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
      },
      request
    );

    return createdResponse(
      apiKey,
      'API key created successfully. Save the key - it will not be shown again.'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
