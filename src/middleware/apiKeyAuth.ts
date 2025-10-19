import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse, forbiddenResponse } from '@/utils/apiResponse';
import {
  validateApiKey,
  hasPermission,
  getRequiredPermission,
  logApiKeyUsage,
} from '@/services/apiKey.service';
import { ApiKeyPermission } from '@/schemas/apiKey.schema';

/**
 * API key authentication result
 */
export interface ApiKeyAuth {
  id: string;
  tenantId: string;
  permissions: string[];
  rateLimit: number;
  tenant: {
    id: string;
    tenantId: string;
    name: string;
    status: string;
  };
}

/**
 * Extract API key from request headers
 *
 * @param request - Next.js request object
 * @returns API key string or null
 */
function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Authenticate request using API key
 *
 * @param request - Next.js request object
 * @param requiredPermission - Optional specific permission required
 * @returns API key auth details or error response
 *
 * @example
 * const auth = await requireApiKey(request);
 * if (auth instanceof NextResponse) return auth;
 * console.log(auth.tenantId);
 *
 * @example
 * const auth = await requireApiKey(request, 'write:pages');
 * if (auth instanceof NextResponse) return auth;
 */
export async function requireApiKey(
  request: NextRequest,
  requiredPermission?: ApiKeyPermission
): Promise<ApiKeyAuth | NextResponse> {
  // Extract API key
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return unauthorizedResponse('API key required');
  }

  // Validate API key
  const auth = await validateApiKey(apiKey);

  if (!auth) {
    return unauthorizedResponse('Invalid or expired API key');
  }

  // Check tenant status
  if (auth.tenant.status === 'suspended') {
    return forbiddenResponse('Tenant account is suspended');
  }

  // Check specific permission if required
  if (requiredPermission) {
    if (!hasPermission(auth.permissions, requiredPermission)) {
      return forbiddenResponse(
        `Permission denied: ${requiredPermission} required`
      );
    }
  }

  return auth;
}

/**
 * Authenticate request using API key with automatic permission checking
 * Determines required permission based on request method and path
 *
 * @param request - Next.js request object
 * @returns API key auth details or error response
 */
export async function requireApiKeyWithPermission(
  request: NextRequest
): Promise<ApiKeyAuth | NextResponse> {
  // Extract API key
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return unauthorizedResponse('API key required');
  }

  // Validate API key
  const auth = await validateApiKey(apiKey);

  if (!auth) {
    return unauthorizedResponse('Invalid or expired API key');
  }

  // Check tenant status
  if (auth.tenant.status === 'suspended') {
    return forbiddenResponse('Tenant account is suspended');
  }

  // Determine required permission from request
  const requiredPermission = getRequiredPermission(
    request.method,
    request.nextUrl.pathname
  );

  if (requiredPermission) {
    if (!hasPermission(auth.permissions, requiredPermission)) {
      return forbiddenResponse(
        `Permission denied: ${requiredPermission} required`
      );
    }
  }

  return auth;
}

/**
 * Wrapper for API routes to add API key authentication and usage logging
 *
 * @param handler - API route handler
 * @param options - Options
 * @returns Wrapped handler
 *
 * @example
 * export const GET = withApiKey(async (request, auth) => {
 *   // auth contains API key details
 *   return successResponse({ data: 'something' });
 * });
 */
export function withApiKey<T extends any[]>(
  handler: (request: NextRequest, auth: ApiKeyAuth, ...args: T) => Promise<NextResponse>,
  options: {
    permission?: ApiKeyPermission;
    autoPermission?: boolean;
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now();

    // Authenticate with API key
    const auth = options.autoPermission
      ? await requireApiKeyWithPermission(request)
      : await requireApiKey(request, options.permission);

    if (auth instanceof NextResponse) {
      return auth;
    }

    // Call handler
    let response: NextResponse;
    try {
      response = await handler(request, auth, ...args);
    } catch (error) {
      // Log failed request
      await logApiKeyUsage(
        auth.id,
        request.nextUrl.pathname,
        request.method,
        500,
        Date.now() - startTime,
        request.headers.get('x-forwarded-for') || undefined
      );
      throw error;
    }

    // Log successful request
    await logApiKeyUsage(
      auth.id,
      request.nextUrl.pathname,
      request.method,
      response.status,
      Date.now() - startTime,
      request.headers.get('x-forwarded-for') || undefined
    );

    return response;
  };
}

/**
 * Check if request is authenticated with API key
 * Non-blocking version that returns null instead of error response
 *
 * @param request - Next.js request object
 * @returns API key auth or null
 */
export async function getApiKeyAuth(
  request: NextRequest
): Promise<ApiKeyAuth | null> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return null;
  }

  const auth = await validateApiKey(apiKey);

  if (!auth || auth.tenant.status === 'suspended') {
    return null;
  }

  return auth;
}

/**
 * Middleware to support both JWT and API key authentication
 * Try API key first, fall back to JWT
 *
 * @param request - Next.js request object
 * @param jwtAuth - Function to get JWT auth
 * @returns Auth result (API key or JWT)
 */
export async function requireAuthWithApiKey<T>(
  request: NextRequest,
  jwtAuth: () => Promise<T | NextResponse>
): Promise<(ApiKeyAuth | T) | NextResponse> {
  // Try API key first
  const apiKeyAuth = await getApiKeyAuth(request);

  if (apiKeyAuth) {
    return apiKeyAuth;
  }

  // Fall back to JWT
  return jwtAuth();
}
