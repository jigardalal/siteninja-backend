import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import {
  errorResponse,
  validationErrorResponse,
  conflictResponse,
  notFoundResponse,
} from '@/utils/apiResponse';

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Prisma-specific errors
 *
 * @param error - Prisma error object
 * @returns NextResponse with appropriate error message and status code
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError
): NextResponse {
  console.error('[Prisma Error]', {
    code: error.code,
    meta: error.meta,
    message: error.message,
  });

  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      return conflictResponse(
        `A record with this ${field} already exists. Please use a different value.`
      );
    }

    case 'P2003': {
      // Foreign key constraint failed
      const field = error.meta?.field_name as string | undefined;
      return errorResponse(
        `Referenced ${field || 'resource'} does not exist`,
        400
      );
    }

    case 'P2025': {
      // Record not found
      return notFoundResponse('Resource');
    }

    case 'P2014': {
      // Required relation violation
      return errorResponse(
        'Cannot delete this resource because it has related records',
        400
      );
    }

    case 'P2000': {
      // Value too long for column
      const column = error.meta?.column_name as string | undefined;
      return errorResponse(
        `Value for ${column || 'field'} is too long`,
        400
      );
    }

    case 'P2011': {
      // Null constraint violation
      const constraint = error.meta?.constraint as string | undefined;
      return errorResponse(
        `Required field ${constraint || 'is missing'}`,
        400
      );
    }

    case 'P2015': {
      // Related record not found
      return errorResponse('Related record not found', 404);
    }

    case 'P2016': {
      // Query interpretation error
      return errorResponse('Invalid query parameters', 400);
    }

    case 'P2021': {
      // Table does not exist
      console.error('[Database] Table does not exist:', error.meta);
      return errorResponse('Database configuration error', 500);
    }

    case 'P2022': {
      // Column does not exist
      console.error('[Database] Column does not exist:', error.meta);
      return errorResponse('Database configuration error', 500);
    }

    default: {
      console.error('[Prisma] Unknown error code:', error.code);
      return errorResponse(
        process.env.NODE_ENV === 'production'
          ? 'A database error occurred'
          : `Database error: ${error.message}`,
        500
      );
    }
  }
}

/**
 * Handle Zod validation errors
 *
 * @param error - Zod error object
 * @returns NextResponse with validation error details
 */
function handleZodError(error: ZodError): NextResponse {
  const validationErrors = error.errors.map((err) => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
  }));

  console.error('[Validation Error]', validationErrors);

  return validationErrorResponse(validationErrors);
}

/**
 * Handle NextAuth errors
 *
 * @param error - NextAuth error
 * @returns NextResponse with appropriate error
 */
function handleAuthError(error: Error): NextResponse {
  console.error('[Auth Error]', error.message);

  if (error.message.includes('CredentialsSignin')) {
    return errorResponse('Invalid credentials', 401);
  }

  if (error.message.includes('SessionRequired')) {
    return errorResponse('Authentication required', 401);
  }

  if (error.message.includes('AccessDenied')) {
    return errorResponse('Access denied', 403);
  }

  return errorResponse('Authentication error', 401);
}

/**
 * Handle filesystem errors (for file uploads)
 *
 * @param error - Filesystem error
 * @returns NextResponse with appropriate error
 */
function handleFilesystemError(error: NodeJS.ErrnoException): NextResponse {
  console.error('[Filesystem Error]', {
    code: error.code,
    path: error.path,
    message: error.message,
  });

  switch (error.code) {
    case 'ENOENT':
      return notFoundResponse('File');
    case 'EACCES':
    case 'EPERM':
      return errorResponse('Permission denied', 403);
    case 'ENOSPC':
      return errorResponse('Storage space unavailable', 507);
    case 'EMFILE':
    case 'ENFILE':
      return errorResponse('Too many open files', 500);
    default:
      return errorResponse('File operation failed', 500);
  }
}

/**
 * Global error handler for API routes
 *
 * @param error - Any error object
 * @returns NextResponse with formatted error
 */
export function handleApiError(error: any): NextResponse {
  // Log error with context
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] API Error:`, {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  // Handle custom application errors
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, error.details);
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('[Prisma Validation]', error.message);
    return errorResponse('Invalid data provided to database', 400);
  }

  // Handle Prisma initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('[Prisma Init Error]', error.message);
    return errorResponse('Database connection error', 500);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Handle NextAuth errors
  if (error.name === 'NextAuthError' || error.message?.includes('NextAuth')) {
    return handleAuthError(error);
  }

  // Handle filesystem errors
  if ('code' in error && typeof error.code === 'string') {
    return handleFilesystemError(error as NodeJS.ErrnoException);
  }

  // Handle TypeError (often from null/undefined access)
  if (error instanceof TypeError) {
    console.error('[TypeError]', error.message, error.stack);
    return errorResponse(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : `Type error: ${error.message}`,
      500
    );
  }

  // Handle RangeError
  if (error instanceof RangeError) {
    console.error('[RangeError]', error.message);
    return errorResponse('Invalid range or value', 400);
  }

  // Handle SyntaxError (JSON parsing, etc.)
  if (error instanceof SyntaxError) {
    console.error('[SyntaxError]', error.message);
    return errorResponse('Invalid request format', 400);
  }

  // Generic error handler (last resort)
  return errorResponse(
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message || 'Internal server error',
    error.statusCode || 500
  );
}

/**
 * Async error wrapper for API route handlers
 * Automatically catches and handles errors
 *
 * @param handler - Async function to wrap
 * @returns Wrapped function with error handling
 *
 * @example
 * export const GET = withErrorHandler(async (request: NextRequest) => {
 *   // Your code here
 *   return successResponse(data);
 * });
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Sanitize error message for production
 * Removes sensitive information from error messages
 *
 * @param message - Original error message
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(message: string): string {
  if (process.env.NODE_ENV === 'production') {
    // Remove file paths
    message = message.replace(/\/[\w\/.-]+/g, '[path]');

    // Remove database connection strings
    message = message.replace(/postgresql:\/\/[^\s]+/g, '[connection]');

    // Remove API keys
    message = message.replace(/\b[A-Za-z0-9_-]{20,}\b/g, '[key]');

    // Remove email addresses
    message = message.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]');
  }

  return message;
}

/**
 * Log error with context for monitoring
 *
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(error: any, context?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: sanitizeErrorMessage(error.message),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    context,
    environment: process.env.NODE_ENV,
  };

  console.error('[Error Log]', JSON.stringify(logEntry, null, 2));

  // TODO: Send to external monitoring service (Sentry, Datadog, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   await sendToMonitoring(logEntry);
  // }
}
