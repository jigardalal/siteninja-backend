import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { handleApiError } from '@/middleware/errorHandler';
import { paginatedResponse, forbiddenResponse } from '@/utils/apiResponse';
import { getAllAuditLogs } from '@/services/audit.service';
import { z } from 'zod';

const QueryAllAuditSchema = z.object({
  tenantId: z.string().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().datetime().transform((s) => new Date(s)).optional(),
  endDate: z.string().datetime().transform((s) => new Date(s)).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/audit
 * Query all audit logs (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Require super admin
    const auth = await requireAuth(request, ['super_admin']);
    if (auth instanceof NextResponse) return auth;

    // Verify super admin role
    if (auth.role !== 'super_admin') {
      return forbiddenResponse('Only super admins can access all audit logs');
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryObj: any = {};

    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const query = QueryAllAuditSchema.parse(queryObj);

    // Get all audit logs
    const result = await getAllAuditLogs({
      tenantId: query.tenantId,
      userId: query.userId,
      action: query.action,
      resourceType: query.resourceType,
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
