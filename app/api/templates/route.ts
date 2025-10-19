import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/middleware/auth';
import { validateBody, validateQuery } from '@/middleware/validate';
import { handleApiError } from '@/middleware/errorHandler';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '@/utils/apiResponse';
import {
  CreateTemplateSchema,
  QueryTemplateSchema,
} from '@/schemas/template.schema';
import { logCreate } from '@/services/audit.service';
import { getCached, setCached, CacheKeys, CacheTTL } from '@/services/cache.service';

/**
 * GET /api/templates
 * List all templates (filtered and paginated)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate query parameters
    const query = validateQuery(request, QueryTemplateSchema);
    if (query instanceof NextResponse) return query;

    const { category, industry, isPremium, isActive, page, limit, sort, order } = query;

    // Build cache key
    const cacheKey = `templates:${category}:${industry}:${isPremium}:${isActive}:${page}:${limit}`;

    // Try cache
    const cached = await getCached<any>(cacheKey);
    if (cached) {
      return paginatedResponse(cached.templates, page, limit, cached.total);
    }

    // Build where clause
    const where: any = {};

    if (category) where.category = category;
    if (industry) where.industry = industry;
    if (isPremium !== undefined) where.isPremium = isPremium;
    if (isActive !== undefined) where.isActive = isActive;

    // Get templates
    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: order },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          industry: true,
          previewImage: true,
          isPremium: true,
          isActive: true,
          sortOrder: true,
          createdAt: true,
          // Don't expose defaultBranding and defaultSections in list
        },
      }),
      prisma.template.count({ where }),
    ]);

    // Cache result
    await setCached(cacheKey, { templates, total }, CacheTTL.long);

    return paginatedResponse(templates, page, limit, total);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/templates
 * Create a new template (admin/super_admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin or super_admin
    const auth = await requireAuth(request, ['admin', 'super_admin']);
    if (auth instanceof NextResponse) return auth;

    // Validate request body
    const body = await validateBody(request, CreateTemplateSchema);
    if (body instanceof NextResponse) return body;

    // Create template
    const template = await prisma.template.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        industry: body.industry,
        previewImage: body.previewImage,
        isPremium: body.isPremium ?? false,
        isActive: body.isActive ?? true,
        defaultBranding: body.defaultBranding,
        defaultSections: body.defaultSections,
        sortOrder: body.sortOrder ?? 0,
        createdBy: auth.id,
      },
    });

    // Log audit
    await logCreate(auth.id, undefined, 'template', template.id, template, request);

    return createdResponse(template, 'Template created successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
