import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  successResponse,
  createdResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  conflictResponse,
} from '@/utils/apiResponse';
import { CreateSectionSchema, SectionQuerySchema } from '@/schemas/section.schema';
import { Prisma } from '@prisma/client';

/**
 * GET /api/tenants/:tenantId/pages/:pageId/sections
 *
 * List all sections for a page
 *
 * Query parameters:
 * - type: Filter by section type
 * - sort: Sort field (default: 'sortOrder')
 * - order: Sort order (default: 'asc')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = await params;
    const { searchParams } = new URL(request.url);

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Parse query parameters
    const queryResult = SectionQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return validationErrorResponse(
        queryResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const { type, sort, order } = queryResult.data;

    // Build where clause
    const where: Prisma.SectionWhereInput = {
      pageId,
      ...(type && { type }),
    };

    // Fetch sections
    const sections = await prisma.section.findMany({
      where,
      orderBy: { [sort!]: order },
    });

    return successResponse(sections);
  } catch (error: any) {
    console.error('Error listing sections:', error);
    return errorResponse('Failed to list sections: ' + error.message);
  }
}

/**
 * POST /api/tenants/:tenantId/pages/:pageId/sections
 *
 * Create a new section for a page
 *
 * Request body:
 * - sectionId: Unique identifier within the page (required)
 * - type: Section type (required)
 * - content: JSONB content (required)
 * - sortOrder: Display order (optional, auto-incremented)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string; pageId: string } }
) {
  try {
    const { tenantId, pageId } = await params;
    const body = await request.json();

    // Verify page exists and belongs to tenant
    const page = await prisma.page.findFirst({
      where: { id: pageId, tenantId },
    });

    if (!page || page.deletedAt) {
      return notFoundResponse('Page');
    }

    // Validate request body
    const result = CreateSectionSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      );
    }

    const data = result.data;

    // Check for duplicate sectionId within page
    const existingSectionId = await prisma.section.findFirst({
      where: {
        pageId,
        sectionId: data.sectionId,
      },
    });

    if (existingSectionId) {
      return conflictResponse('A section with this sectionId already exists on this page');
    }

    // Auto-increment sortOrder if not provided
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const maxSortOrder = await prisma.section.aggregate({
        where: { pageId },
        _max: { sortOrder: true },
      });
      sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
    }

    // Create section
    const section = await prisma.section.create({
      data: {
        ...data,
        pageId,
        sortOrder,
      },
    });

    return createdResponse(section, 'Section created successfully');
  } catch (error: any) {
    console.error('Error creating section:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return conflictResponse('A section with this sectionId already exists on this page');
      }
    }

    return errorResponse('Failed to create section: ' + error.message);
  }
}
