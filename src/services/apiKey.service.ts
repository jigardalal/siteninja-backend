import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { ApiKeyPermission } from '@/schemas/apiKey.schema';

/**
 * API key response (includes full key only on creation)
 */
export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  key?: string; // Only included on creation
}

/**
 * Generate a new API key for a tenant
 *
 * @param tenantId - Tenant ID
 * @param name - Descriptive name for the API key
 * @param permissions - Array of permissions
 * @param createdBy - User ID who created the key
 * @param options - Additional options
 * @returns API key details including the full key (ONE TIME ONLY)
 *
 * @example
 * const apiKey = await generateApiKey(
 *   tenantId,
 *   'Production API Key',
 *   ['read:pages', 'write:pages'],
 *   userId,
 *   { rateLimit: 5000, expiresAt: new Date('2025-12-31') }
 * );
 *
 * console.log(apiKey.key); // Save this - it won't be shown again!
 */
export async function generateApiKey(
  tenantId: string,
  name: string,
  permissions: ApiKeyPermission[],
  createdBy: string,
  options: {
    rateLimit?: number;
    expiresAt?: Date;
  } = {}
): Promise<ApiKeyResponse> {
  // Generate random API key with prefix
  const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const randomPart = crypto.randomBytes(32).toString('hex');
  const key = `sn_${environment}_${randomPart}`;

  // Extract prefix for identification (first 12 chars: sn_live_ or sn_test_)
  const keyPrefix = key.substring(0, 12);

  // Hash the key for secure storage
  const keyHash = await bcrypt.hash(key, 10);

  // Create API key record
  const apiKey = await prisma.apiKey.create({
    data: {
      tenantId,
      name,
      keyHash,
      keyPrefix,
      permissions,
      rateLimit: options.rateLimit || 1000,
      expiresAt: options.expiresAt,
      createdBy,
    },
  });

  console.log(`[API Key] Created new API key: ${keyPrefix}... for tenant ${tenantId}`);

  // Return full key ONLY on creation
  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    permissions: apiKey.permissions,
    rateLimit: apiKey.rateLimit,
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    isActive: apiKey.isActive,
    createdAt: apiKey.createdAt,
    key, // Full key - save this!
  };
}

/**
 * Validate an API key and return its details
 *
 * @param key - Full API key string
 * @returns API key details if valid, null if invalid
 */
export async function validateApiKey(
  key: string
): Promise<{
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
} | null> {
  try {
    // Extract prefix
    const keyPrefix = key.substring(0, 12);

    // Find API key by prefix (fast lookup)
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyPrefix,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!apiKey) {
      console.warn(`[API Key] No active key found with prefix: ${keyPrefix}`);
      return null;
    }

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      console.warn(`[API Key] Expired key: ${apiKey.id}`);
      return null;
    }

    // Verify key hash (constant-time comparison)
    const isValid = await bcrypt.compare(key, apiKey.keyHash);
    if (!isValid) {
      console.warn(`[API Key] Invalid key hash for prefix: ${keyPrefix}`);
      return null;
    }

    // Update last used timestamp (async, don't wait)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        console.error('[API Key] Failed to update lastUsedAt:', error);
      });

    return {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      tenant: apiKey.tenant,
    };
  } catch (error) {
    console.error('[API Key] Validation error:', error);
    return null;
  }
}

/**
 * Check if an API key has a specific permission
 *
 * @param permissions - Array of permissions from API key
 * @param requiredPermission - Permission to check
 * @returns True if permission is granted
 */
export function hasPermission(
  permissions: string[],
  requiredPermission: ApiKeyPermission
): boolean {
  // Admin permission grants all access
  if (permissions.includes('admin:all')) {
    return true;
  }

  // Check for specific permission
  if (permissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard permissions (e.g., 'write:*' includes 'write:pages')
  const [action, resource] = requiredPermission.split(':');
  const wildcardPermission = `${action}:*`;

  return permissions.includes(wildcardPermission);
}

/**
 * Revoke (deactivate) an API key
 *
 * @param apiKeyId - API key ID to revoke
 * @param tenantId - Tenant ID (for authorization)
 * @returns Updated API key
 */
export async function revokeApiKey(
  apiKeyId: string,
  tenantId: string
): Promise<void> {
  await prisma.apiKey.updateMany({
    where: {
      id: apiKeyId,
      tenantId, // Ensure tenant can only revoke their own keys
    },
    data: {
      isActive: false,
    },
  });

  console.log(`[API Key] Revoked API key: ${apiKeyId}`);
}

/**
 * Delete an API key permanently
 *
 * @param apiKeyId - API key ID to delete
 * @param tenantId - Tenant ID (for authorization)
 */
export async function deleteApiKey(
  apiKeyId: string,
  tenantId: string
): Promise<void> {
  await prisma.apiKey.deleteMany({
    where: {
      id: apiKeyId,
      tenantId,
    },
  });

  console.log(`[API Key] Deleted API key: ${apiKeyId}`);
}

/**
 * List API keys for a tenant
 *
 * @param tenantId - Tenant ID
 * @param options - Query options
 * @returns List of API keys (WITHOUT full keys)
 */
export async function listApiKeys(
  tenantId: string,
  options: {
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  keys: ApiKeyResponse[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { isActive, page = 1, limit = 20 } = options;

  const where: any = { tenantId };
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.apiKey.count({ where }),
  ]);

  return {
    keys: keys as ApiKeyResponse[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get API key usage statistics
 *
 * @param apiKeyId - API key ID
 * @param tenantId - Tenant ID (for authorization)
 * @param options - Query options
 * @returns Usage statistics
 */
export async function getApiKeyUsage(
  apiKeyId: string,
  tenantId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  usage: any[];
  total: number;
  statistics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  };
}> {
  // Verify API key belongs to tenant
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      tenantId,
    },
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  const { startDate, endDate, page = 1, limit = 100 } = options;

  const where: any = { apiKeyId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [usage, total, stats] = await Promise.all([
    prisma.apiKeyUsage.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.apiKeyUsage.count({ where }),
    prisma.apiKeyUsage.aggregate({
      where,
      _count: true,
      _avg: {
        responseTimeMs: true,
      },
    }),
  ]);

  // Calculate success/failure counts
  const successCount = usage.filter(
    (u) => u.statusCode && u.statusCode >= 200 && u.statusCode < 400
  ).length;
  const failureCount = total - successCount;

  return {
    usage,
    total,
    statistics: {
      totalRequests: total,
      successfulRequests: successCount,
      failedRequests: failureCount,
      averageResponseTime: stats._avg.responseTimeMs || 0,
    },
  };
}

/**
 * Log API key usage
 * Should be called by API key auth middleware
 *
 * @param apiKeyId - API key ID
 * @param endpoint - Endpoint path
 * @param method - HTTP method
 * @param statusCode - Response status code
 * @param responseTimeMs - Response time in milliseconds
 * @param ipAddress - Client IP address
 */
export async function logApiKeyUsage(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.apiKeyUsage.create({
      data: {
        apiKeyId,
        endpoint: endpoint.substring(0, 255), // Limit length
        method,
        statusCode,
        responseTimeMs,
        ipAddress: ipAddress?.substring(0, 45),
      },
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break API
    console.error('[API Key] Failed to log usage:', error);
  }
}

/**
 * Get endpoint permissions from request path and method
 *
 * @param method - HTTP method
 * @param path - Request path
 * @returns Required permission
 */
export function getRequiredPermission(
  method: string,
  path: string
): ApiKeyPermission | null {
  // Parse resource from path
  const pathParts = path.split('/').filter(Boolean);

  // Remove 'api' prefix if present
  if (pathParts[0] === 'api') {
    pathParts.shift();
  }

  // Determine resource type
  let resource: string | null = null;

  if (pathParts.includes('pages')) resource = 'pages';
  else if (pathParts.includes('sections')) resource = 'sections';
  else if (pathParts.includes('branding')) resource = 'branding';
  else if (pathParts.includes('navigation')) resource = 'navigation';
  else if (pathParts.includes('seo')) resource = 'seo';
  else if (pathParts.includes('assets')) resource = 'assets';
  else if (pathParts.includes('users')) resource = 'users';
  else if (pathParts.includes('webhooks')) resource = 'webhooks';

  if (!resource) {
    return null; // Unknown resource
  }

  // Map HTTP method to permission action
  const action = (() => {
    if (method === 'GET') return 'read';
    if (method === 'POST') return 'write';
    if (method === 'PUT' || method === 'PATCH') return 'write';
    if (method === 'DELETE') return 'delete';
    return null;
  })();

  if (!action) {
    return null;
  }

  return `${action}:${resource}` as ApiKeyPermission;
}

/**
 * Rotate an API key (create new, revoke old)
 *
 * @param oldKeyId - ID of key to rotate
 * @param tenantId - Tenant ID
 * @param createdBy - User ID
 * @returns New API key
 */
export async function rotateApiKey(
  oldKeyId: string,
  tenantId: string,
  createdBy: string
): Promise<ApiKeyResponse> {
  // Get old key details
  const oldKey = await prisma.apiKey.findFirst({
    where: {
      id: oldKeyId,
      tenantId,
    },
  });

  if (!oldKey) {
    throw new Error('API key not found');
  }

  // Create new key with same settings
  const newKey = await generateApiKey(
    tenantId,
    `${oldKey.name} (Rotated)`,
    oldKey.permissions as ApiKeyPermission[],
    createdBy,
    {
      rateLimit: oldKey.rateLimit,
      expiresAt: oldKey.expiresAt || undefined,
    }
  );

  // Revoke old key
  await revokeApiKey(oldKeyId, tenantId);

  console.log(`[API Key] Rotated key ${oldKeyId} -> ${newKey.id}`);

  return newKey;
}
