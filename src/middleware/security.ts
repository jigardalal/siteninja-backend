import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  contentSecurityPolicy?: string;
  strictTransportSecurity?: string;
  xContentTypeOptions?: string;
  xFrameOptions?: string;
  xXSSProtection?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
}

/**
 * Default security headers
 */
export const DEFAULT_SECURITY_HEADERS: SecurityHeadersConfig = {
  contentSecurityPolicy:
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXSSProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy:
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

/**
 * Apply security headers to response
 *
 * @param response - Next.js response
 * @param config - Security headers configuration
 * @returns Response with security headers
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_HEADERS
): NextResponse {
  const headers = response.headers;

  if (config.contentSecurityPolicy) {
    headers.set('Content-Security-Policy', config.contentSecurityPolicy);
  }

  if (config.strictTransportSecurity) {
    headers.set('Strict-Transport-Security', config.strictTransportSecurity);
  }

  if (config.xContentTypeOptions) {
    headers.set('X-Content-Type-Options', config.xContentTypeOptions);
  }

  if (config.xFrameOptions) {
    headers.set('X-Frame-Options', config.xFrameOptions);
  }

  if (config.xXSSProtection) {
    headers.set('X-XSS-Protection', config.xXSSProtection);
  }

  if (config.referrerPolicy) {
    headers.set('Referrer-Policy', config.referrerPolicy);
  }

  if (config.permissionsPolicy) {
    headers.set('Permissions-Policy', config.permissionsPolicy);
  }

  return response;
}

/**
 * CORS configuration
 */
export interface CORSConfig {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG: CORSConfig = {
  allowedOrigins: ['*'], // Update in production
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Requested-With',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Apply CORS headers to response
 *
 * @param request - Next.js request
 * @param response - Next.js response
 * @param config - CORS configuration
 * @returns Response with CORS headers
 */
export function applyCORSHeaders(
  request: NextRequest,
  response: NextResponse,
  config: CORSConfig = DEFAULT_CORS_CONFIG
): NextResponse {
  const origin = request.headers.get('origin');
  const headers = response.headers;

  // Check if origin is allowed
  if (origin) {
    const isAllowed =
      config.allowedOrigins?.includes('*') ||
      config.allowedOrigins?.includes(origin);

    if (isAllowed) {
      headers.set(
        'Access-Control-Allow-Origin',
        config.allowedOrigins?.includes('*') ? '*' : origin
      );
    }
  }

  // Set other CORS headers
  if (config.allowedMethods) {
    headers.set(
      'Access-Control-Allow-Methods',
      config.allowedMethods.join(', ')
    );
  }

  if (config.allowedHeaders) {
    headers.set(
      'Access-Control-Allow-Headers',
      config.allowedHeaders.join(', ')
    );
  }

  if (config.exposedHeaders) {
    headers.set(
      'Access-Control-Expose-Headers',
      config.exposedHeaders.join(', ')
    );
  }

  if (config.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (config.maxAge) {
    headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }

  return response;
}

/**
 * Handle CORS preflight requests
 *
 * @param request - Next.js request
 * @param config - CORS configuration
 * @returns Preflight response or null
 */
export function handlePreflightRequest(
  request: NextRequest,
  config: CORSConfig = DEFAULT_CORS_CONFIG
): NextResponse | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const response = new NextResponse(null, { status: 204 });
  return applyCORSHeaders(request, response, config);
}

/**
 * Wrapper to add security headers to API route responses
 *
 * @param handler - API route handler
 * @param options - Security options
 * @returns Wrapped handler
 *
 * @example
 * export const GET = withSecurity(async (request) => {
 *   return successResponse({ data: 'something' });
 * });
 */
export function withSecurity<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: {
    securityHeaders?: SecurityHeadersConfig;
    cors?: CORSConfig;
  } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Handle preflight
    const preflight = handlePreflightRequest(request, options.cors);
    if (preflight) {
      return applySecurityHeaders(preflight, options.securityHeaders);
    }

    // Call handler
    const response = await handler(request, ...args);

    // Apply security headers
    let securedResponse = applySecurityHeaders(
      response,
      options.securityHeaders
    );

    // Apply CORS headers
    securedResponse = applyCORSHeaders(request, securedResponse, options.cors);

    return securedResponse;
  };
}
