import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient } from '@/lib/redis';
import { rateLimitResponse } from '@/utils/apiResponse';

/**
 * Rate limit configurations
 */
export const RateLimitConfig = {
  // Anonymous users (by IP)
  anonymous: {
    requests: 100,
    window: '1 h',
  },
  // Authenticated users
  authenticated: {
    requests: 1000,
    window: '1 h',
  },
  // API keys (custom per-key limits)
  apiKey: {
    requests: 5000,
    window: '1 h',
  },
  // Special endpoints (stricter limits)
  auth: {
    requests: 10,
    window: '15 m',
  },
  upload: {
    requests: 20,
    window: '1 h',
  },
};

/**
 * Create rate limiter instance
 */
function createRateLimiter(requests: number, window: string) {
  const redis = getRedisClient();

  if (!redis) {
    // No Redis - return null (rate limiting disabled)
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: 'ratelimit',
  });
}

/**
 * Get identifier for rate limiting
 * Priority: API key > User ID > IP address
 */
function getIdentifier(
  request: NextRequest,
  userId?: string,
  apiKeyId?: string
): string {
  if (apiKeyId) {
    return `apikey:${apiKeyId}`;
  }

  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 *
 * @param request - Next.js request
 * @param identifier - Unique identifier (IP, user ID, API key)
 * @param config - Rate limit configuration
 * @returns Null if within limit, error response if exceeded
 */
export async function checkRateLimit(
  request: NextRequest,
  identifier: string,
  config: { requests: number; window: string } = RateLimitConfig.authenticated
): Promise<NextResponse | null> {
  const ratelimit = createRateLimiter(config.requests, config.window);

  if (!ratelimit) {
    // Rate limiting disabled (no Redis)
    return null;
  }

  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    // Add rate limit headers to request (for later use)
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', limit.toString());
    headers.set('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    headers.set('X-RateLimit-Reset', reset.toString());

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      const response = rateLimitResponse(retryAfter);

      // Add rate limit headers to error response
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', reset.toString());
      response.headers.set('Retry-After', retryAfter.toString());

      return response;
    }

    return null; // Within limits
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // On error, allow the request (fail open)
    return null;
  }
}

/**
 * Rate limit middleware for anonymous requests
 */
export async function rateLimitAnonymous(
  request: NextRequest
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request);
  return checkRateLimit(request, identifier, RateLimitConfig.anonymous);
}

/**
 * Rate limit middleware for authenticated requests
 */
export async function rateLimitAuthenticated(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request, userId);
  return checkRateLimit(request, identifier, RateLimitConfig.authenticated);
}

/**
 * Rate limit middleware for API key requests
 */
export async function rateLimitApiKey(
  request: NextRequest,
  apiKeyId: string,
  customLimit?: number
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request, undefined, apiKeyId);
  const config = customLimit
    ? { requests: customLimit, window: '1 h' }
    : RateLimitConfig.apiKey;

  return checkRateLimit(request, identifier, config);
}

/**
 * Rate limit wrapper for API routes
 *
 * @param handler - API route handler
 * @param options - Rate limit options
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * export const POST = withRateLimit(
 *   async (request) => {
 *     return successResponse({ data: 'something' });
 *   },
 *   { requests: 10, window: '1 m' }
 * );
 */
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options?: {
    requests?: number;
    window?: string;
    getUserId?: (request: NextRequest) => Promise<string | undefined>;
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    // Get user ID if provided
    const userId = options?.getUserId
      ? await options.getUserId(request)
      : undefined;

    // Get identifier
    const identifier = getIdentifier(request, userId);

    // Check rate limit
    const config = options?.requests && options?.window
      ? { requests: options.requests, window: options.window }
      : userId
      ? RateLimitConfig.authenticated
      : RateLimitConfig.anonymous;

    const rateLimitError = await checkRateLimit(request, identifier, config);

    if (rateLimitError) {
      return rateLimitError;
    }

    // Call handler
    const response = await handler(request, ...args);

    // Add rate limit headers to successful response
    // (headers were set during checkRateLimit)

    return response;
  };
}

/**
 * Rate limit for specific endpoints
 */
export const EndpointRateLimits = {
  /**
   * Auth endpoints (login, register) - stricter limits
   */
  auth: (request: NextRequest) =>
    checkRateLimit(
      request,
      getIdentifier(request),
      RateLimitConfig.auth
    ),

  /**
   * Upload endpoints - moderate limits
   */
  upload: (request: NextRequest, userId?: string) =>
    checkRateLimit(
      request,
      getIdentifier(request, userId),
      RateLimitConfig.upload
    ),
};

/**
 * Get rate limit status for an identifier
 * Useful for checking limits without incrementing counter
 */
export async function getRateLimitStatus(
  identifier: string,
  config: { requests: number; window: string } = RateLimitConfig.authenticated
): Promise<{
  limit: number;
  remaining: number;
  reset: number;
} | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  try {
    const key = `ratelimit:${identifier}`;
    const count = (await redis.get(key)) as number | null;

    if (!count) {
      return {
        limit: config.requests,
        remaining: config.requests,
        reset: Date.now() + parseWindow(config.window),
      };
    }

    return {
      limit: config.requests,
      remaining: Math.max(0, config.requests - count),
      reset: Date.now() + parseWindow(config.window),
    };
  } catch (error) {
    console.error('[RateLimit] Error getting status:', error);
    return null;
  }
}

/**
 * Parse window string to milliseconds
 */
function parseWindow(window: string): number {
  const match = window.match(/(\d+)\s*([smhd])/);

  if (!match) {
    return 60000; // Default 1 minute
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };

  return value * multipliers[unit];
}
