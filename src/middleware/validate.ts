import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { validationErrorResponse } from '@/utils/apiResponse';

/**
 * Validate request body against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated data or error response
 *
 * @example
 * const result = await validateBody(request, CreateTenantSchema);
 * if (result instanceof NextResponse) return result;
 * const validatedData = result;
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T | NextResponse> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        }))
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return validationErrorResponse([
        {
          field: 'body',
          message: 'Invalid JSON format',
        },
      ]);
    }

    return validationErrorResponse([
      {
        field: 'body',
        message: 'Failed to parse request body',
      },
    ]);
  }
}

/**
 * Validate query parameters against a Zod schema
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validated query params or error response
 *
 * @example
 * const result = validateQuery(request, QueryTenantSchema);
 * if (result instanceof NextResponse) return result;
 * const { page, limit, sort } = result;
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): T | NextResponse {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryObject: Record<string, string | string[]> = {};

    searchParams.forEach((value, key) => {
      const existing = queryObject[key];
      if (existing) {
        queryObject[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        queryObject[key] = value;
      }
    });

    const result = schema.safeParse(queryObject);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.') || 'query',
          message: err.message,
        }))
      );
    }

    return result.data;
  } catch (error) {
    return validationErrorResponse([
      {
        field: 'query',
        message: 'Failed to parse query parameters',
      },
    ]);
  }
}

/**
 * Validate path parameters against a Zod schema
 *
 * @param params - Path parameters object
 * @param schema - Zod schema to validate against
 * @returns Validated params or error response
 *
 * @example
 * const result = validateParams(params, z.object({ tenantId: z.string().uuid() }));
 * if (result instanceof NextResponse) return result;
 * const { tenantId } = result;
 */
export function validateParams<T>(
  params: Record<string, string | string[]>,
  schema: ZodSchema<T>
): T | NextResponse {
  try {
    const result = schema.safeParse(params);

    if (!result.success) {
      return validationErrorResponse(
        result.error.errors.map((err) => ({
          field: err.path.join('.') || 'params',
          message: err.message,
        }))
      );
    }

    return result.data;
  } catch (error) {
    return validationErrorResponse([
      {
        field: 'params',
        message: 'Failed to validate path parameters',
      },
    ]);
  }
}

/**
 * Higher-order function to wrap API route handlers with validation
 *
 * @param handler - API route handler
 * @param schemas - Validation schemas for body, query, and params
 * @returns Wrapped handler with automatic validation
 *
 * @example
 * export const POST = withValidation(
 *   async (request, context, validated) => {
 *     const { body, params } = validated;
 *     // Use validated data
 *     return successResponse(data);
 *   },
 *   {
 *     body: CreateTenantSchema,
 *     params: z.object({ tenantId: z.string().uuid() }),
 *   }
 * );
 */
export function withValidation<
  TBody = any,
  TQuery = any,
  TParams = any,
  TContext = any
>(
  handler: (
    request: NextRequest,
    context: TContext,
    validated: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    }
  ) => Promise<NextResponse>,
  schemas: {
    body?: ZodSchema<TBody>;
    query?: ZodSchema<TQuery>;
    params?: ZodSchema<TParams>;
  } = {}
) {
  return async (
    request: NextRequest,
    context: TContext
  ): Promise<NextResponse> => {
    const validated: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    } = {};

    // Validate body if schema provided
    if (schemas.body) {
      const bodyResult = await validateBody(request, schemas.body);
      if (bodyResult instanceof NextResponse) {
        return bodyResult;
      }
      validated.body = bodyResult;
    }

    // Validate query if schema provided
    if (schemas.query) {
      const queryResult = validateQuery(request, schemas.query);
      if (queryResult instanceof NextResponse) {
        return queryResult;
      }
      validated.query = queryResult;
    }

    // Validate params if schema provided
    if (schemas.params && context && typeof context === 'object') {
      const params = (context as any).params;
      if (params) {
        const paramsResult = validateParams(params, schemas.params);
        if (paramsResult instanceof NextResponse) {
          return paramsResult;
        }
        validated.params = paramsResult;
      }
    }

    // Call the handler with validated data
    return handler(request, context, validated);
  };
}

/**
 * Validate file upload
 *
 * @param file - File object or form data
 * @param options - Validation options
 * @returns Validation result
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = [],
    allowedExtensions = [],
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file extension
  if (allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension .${extension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Extract and validate multipart form data
 *
 * @param request - Next.js request object
 * @param options - Validation options
 * @returns Form data with validated files
 */
export async function validateFormData(
  request: NextRequest,
  options: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    allowedExtensions?: string[];
    requiredFields?: string[];
  } = {}
): Promise<
  | {
      formData: FormData;
      files: Map<string, File>;
      fields: Map<string, string>;
    }
  | NextResponse
> {
  try {
    const formData = await request.formData();
    const files = new Map<string, File>();
    const fields = new Map<string, string>();

    // Extract files and fields
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Validate file
        const validation = validateFile(value, {
          maxSize: options.maxFileSize,
          allowedTypes: options.allowedFileTypes,
          allowedExtensions: options.allowedExtensions,
        });

        if (!validation.valid) {
          return validationErrorResponse([
            {
              field: key,
              message: validation.error || 'Invalid file',
            },
          ]);
        }

        files.set(key, value);
      } else {
        fields.set(key, value.toString());
      }
    }

    // Check required fields
    if (options.requiredFields) {
      for (const field of options.requiredFields) {
        if (!fields.has(field) && !files.has(field)) {
          return validationErrorResponse([
            {
              field,
              message: `Required field '${field}' is missing`,
            },
          ]);
        }
      }
    }

    return { formData, files, fields };
  } catch (error) {
    return validationErrorResponse([
      {
        field: 'formData',
        message: 'Failed to parse multipart form data',
      },
    ]);
  }
}
