import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
  paginatedResponse,
} from '@/utils/apiResponse';
import { parsePaginationParams, calculateSkip, buildPrismaOrderBy } from '@/utils/pagination';
import { CreatePageSchema, PageQuerySchema, PageIncludeSchema } from '@/schemas/page.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/pages
 *
 * List all pages for a tenant with pagination, filtering, and search
 *
 * Query parameters:
 * - page, limit, sort, order: Pagination
 * - status: Filter by status
 * - search: Search in title, slug
 * - templateId: Filter by template
 * - includeDeleted: Include soft-deleted records
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Parse and validate query parameters
    const queryResult = PageQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return validationErrorResponse(
        queryResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { page, limit, sort, order, status, search, templateId, includeDeleted } = queryResult.data;

    // Build where clause
    const where: Prisma.PageWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(templateId && { templateId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(!includeDeleted && { deletedAt: null }),
    };

    // Execute query with pagination
    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        skip: calculateSkip(page!, limit!),
        take: limit,
        orderBy: buildPrismaOrderBy(sort!, order!),
        include: {
          _count: {
            select: { sections: true },
          },
        },
      }),
      prisma.page.count({ where }),
    ]);

    return paginatedResponse(pages, page!, limit!, total);
  } catch (error: any) {
    console.error('Error listing pages:', error);
    return errorResponse('Failed to list pages: ' + error.message);
  }
}

/**
 * POST /api/tenants/:tenantId/pages
 *
 * Create a new page with optional sections
 *
 * Request body:
 * - title: Page title (required)
 * - slug: URL slug (required, unique per tenant)
 * - description, status, templateId, settings: Optional
 * - sections: Array of sections to create with page (optional)
 *
 * Creates page and sections in a transaction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.deletedAt) {
      return notFoundResponse('Tenant');
    }

    // Validate request body
    const result = CreatePageSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { sections, ...pageData } = result.data;

    // Check for duplicate slug within tenant
    const existingSlug = await prisma.page.findFirst({
      where: {
        tenantId,
        slug: pageData.slug,
        deletedAt: null,
      },
    });

    if (existingSlug) {
      return conflictResponse('A page with this slug already exists for this tenant');
    }

    // Create page and sections in a transaction
    const page = await prisma.$transaction(async (tx) => {
      // Create page
      const newPage = await tx.page.create({
        data: {
          ...pageData,
          tenantId,
        },
      });

      // Create sections if provided
      if (sections && sections.length > 0) {
        await tx.section.createMany({
          data: sections.map((section, index) => ({
            ...section,
            pageId: newPage.id,
            sortOrder: section.sortOrder ?? index,
          })),
        });
      }

      // Fetch page with sections
      return tx.page.findUnique({
        where: { id: newPage.id },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    return createdResponse(page, 'Page created successfully');
  } catch (error: any) {
    console.error('Error creating page:', error);

    // Handle Prisma unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return conflictResponse('A page with this slug already exists for this tenant');
      }
    }

    return errorResponse('Failed to create page: ' + error.message);
  }
}
