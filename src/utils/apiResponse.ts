import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
}

export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, 201);
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(
  error: string,
  statusCode: number = 500,
  details?: Array<{ field: string; message: string }>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode }
  );
}

export function validationErrorResponse(
  errors: Array<{ field: string; message: string }>
): NextResponse<ApiResponse<never>> {
  return errorResponse('Validation failed', 422, errors);
}

export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiResponse<never>> {
  return errorResponse(`${resource} not found`, 404);
}

export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 401);
}

export function forbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 403);
}

export function conflictResponse(
  message: string
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 409);
}

export function rateLimitResponse(
  retryAfter: number = 900
): NextResponse<ApiResponse<never>> {
  const response = errorResponse(
    'Rate limit exceeded',
    429,
    [{ field: 'retryAfter', message: `${retryAfter} seconds` }]
  );

  response.headers.set('Retry-After', retryAfter.toString());
  return response;
}

export function paginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<ApiResponse<PaginatedResponse<T>>> {
  const totalPages = Math.ceil(total / limit);

  return successResponse({
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
