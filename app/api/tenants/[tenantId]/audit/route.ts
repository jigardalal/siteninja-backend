import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { paginatedResponse, successResponse } from '@/utils/apiResponse';
import { getAuditLogs, getAuditStatistics } from '@/services/audit.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const QueryAuditSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  startDate: z.string().datetime().transform((s) => new Date(s)).optional(),
  endDate: z.string().datetime().transform((s) => new Date(s)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  statistics: z.string().transform((v) => v === 'true').optional(),
});

/**
 * GET /api/tenants/:tenantId/audit
 * Query audit logs for a tenant
 */
export async function GET(
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryObj: any = {};

    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const query = QueryAuditSchema.parse(queryObj);

    // Return statistics if requested
    if (query.statistics) {
      const stats = await getAuditStatistics(
        tenant.id,
        query.startDate,
        query.endDate
      );
      return successResponse(stats);
    }

    // Get audit logs
    const result = await getAuditLogs(tenant.id, {
      userId: query.userId,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });

    return paginatedResponse(result.logs, result.page, query.limit, result.total);
  } catch (error) {
    return handleApiError(error);
  }
}
