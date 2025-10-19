import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

/**
 * Audit log entry parameters
 */
export interface AuditLogParams {
  userId?: string;
  tenantId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Create an audit log entry
 * This function is non-blocking and will not throw errors to prevent
 * audit logging from breaking the main application flow
 *
 * @param params - Audit log parameters
 * @returns Promise that resolves when log is created (or fails silently)
 *
 * @example
 * await logAudit({
 *   userId: user.id,
 *   tenantId: tenant.id,
 *   action: 'tenant.create',
 *   resourceType: 'tenant',
 *   resourceId: tenant.id,
 *   newValue: tenant,
 *   ipAddress: request.headers.get('x-forwarded-for'),
 *   userAgent: request.headers.get('user-agent'),
 * });
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const {
      userId,
      tenantId,
      action,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      metadata,
    } = params;

    // Sanitize and serialize values
    const sanitizedOldValue = oldValue
      ? JSON.parse(JSON.stringify(sanitizeValue(oldValue)))
      : null;
    const sanitizedNewValue = newValue
      ? JSON.parse(JSON.stringify(sanitizeValue(newValue)))
      : null;
    const sanitizedMetadata = metadata
      ? JSON.parse(JSON.stringify(sanitizeValue(metadata)))
      : null;

    await prisma.auditLog.create({
      data: {
        userId,
        tenantId,
        action,
        resourceType,
        resourceId,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        ipAddress: ipAddress?.substring(0, 45), // Limit to IPv6 length
        userAgent: userAgent?.substring(0, 1000), // Limit user agent length
        metadata: sanitizedMetadata,
      },
    });

    console.log('[Audit]', {
      action,
      resourceType,
      resourceId,
      userId,
      tenantId,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should never break the app
    console.error('[Audit] Failed to create audit log:', error);
  }
}

/**
 * Log a creation event
 *
 * @param userId - ID of user performing action
 * @param tenantId - ID of tenant
 * @param resourceType - Type of resource created
 * @param resourceId - ID of created resource
 * @param newValue - New resource value
 * @param request - Optional request object for IP/user agent
 */
export async function logCreate(
  userId: string | undefined,
  tenantId: string | undefined,
  resourceType: string,
  resourceId: string,
  newValue: any,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    userId,
    tenantId,
    action: `${resourceType}.create`,
    resourceType,
    resourceId,
    newValue,
    ipAddress: request?.headers.get('x-forwarded-for') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  });
}

/**
 * Log an update event
 *
 * @param userId - ID of user performing action
 * @param tenantId - ID of tenant
 * @param resourceType - Type of resource updated
 * @param resourceId - ID of updated resource
 * @param oldValue - Previous resource value
 * @param newValue - New resource value
 * @param request - Optional request object for IP/user agent
 */
export async function logUpdate(
  userId: string | undefined,
  tenantId: string | undefined,
  resourceType: string,
  resourceId: string,
  oldValue: any,
  newValue: any,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    userId,
    tenantId,
    action: `${resourceType}.update`,
    resourceType,
    resourceId,
    oldValue,
    newValue,
    ipAddress: request?.headers.get('x-forwarded-for') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  });
}

/**
 * Log a deletion event
 *
 * @param userId - ID of user performing action
 * @param tenantId - ID of tenant
 * @param resourceType - Type of resource deleted
 * @param resourceId - ID of deleted resource
 * @param oldValue - Previous resource value
 * @param request - Optional request object for IP/user agent
 */
export async function logDelete(
  userId: string | undefined,
  tenantId: string | undefined,
  resourceType: string,
  resourceId: string,
  oldValue: any,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    userId,
    tenantId,
    action: `${resourceType}.delete`,
    resourceType,
    resourceId,
    oldValue,
    ipAddress: request?.headers.get('x-forwarded-for') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  });
}

/**
 * Log a custom action
 *
 * @param userId - ID of user performing action
 * @param tenantId - ID of tenant
 * @param action - Custom action name
 * @param metadata - Additional metadata
 * @param request - Optional request object for IP/user agent
 */
export async function logCustomAction(
  userId: string | undefined,
  tenantId: string | undefined,
  action: string,
  metadata?: Record<string, any>,
  request?: NextRequest
): Promise<void> {
  await logAudit({
    userId,
    tenantId,
    action,
    metadata,
    ipAddress: request?.headers.get('x-forwarded-for') || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  });
}

/**
 * Get audit logs for a specific tenant
 *
 * @param tenantId - Tenant ID to filter by
 * @param options - Query options
 * @returns Array of audit logs
 */
export async function getAuditLogs(
  tenantId: string,
  options: {
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}
) {
  const {
    userId,
    action,
    resourceType,
    resourceId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = options;

  const where: any = { tenantId };

  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get all audit logs (super admin only)
 *
 * @param options - Query options
 * @returns Array of audit logs
 */
export async function getAllAuditLogs(
  options: {
    tenantId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}
) {
  const {
    tenantId,
    userId,
    action,
    resourceType,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = options;

  const where: any = {};

  if (tenantId) where.tenantId = tenantId;
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            tenantId: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Sanitize sensitive data from values before logging
 * Removes passwords, tokens, and other sensitive fields
 *
 * @param value - Value to sanitize
 * @returns Sanitized value
 */
function sanitizeValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === 'object') {
    const sanitized: any = {};
    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'accessToken',
      'refreshToken',
      'privateKey',
      'creditCard',
      'ssn',
    ];

    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveFields.some((field) =>
        lowerKey.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(val);
      }
    }

    return sanitized;
  }

  return value;
}

/**
 * Get audit statistics for a tenant
 *
 * @param tenantId - Tenant ID
 * @param startDate - Start date for statistics
 * @param endDate - End date for statistics
 * @returns Audit statistics
 */
export async function getAuditStatistics(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: any = { tenantId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [total, byAction, byUser, byResourceType] = await Promise.all([
    // Total count
    prisma.auditLog.count({ where }),

    // Group by action
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),

    // Group by user
    prisma.auditLog.groupBy({
      by: ['userId'],
      where: { ...where, userId: { not: null } },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    }),

    // Group by resource type
    prisma.auditLog.groupBy({
      by: ['resourceType'],
      where: { ...where, resourceType: { not: null } },
      _count: true,
      orderBy: { _count: { resourceType: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    total,
    byAction: byAction.map((item) => ({
      action: item.action,
      count: item._count,
    })),
    byUser: byUser.map((item) => ({
      userId: item.userId,
      count: item._count,
    })),
    byResourceType: byResourceType.map((item) => ({
      resourceType: item.resourceType,
      count: item._count,
    })),
  };
}
