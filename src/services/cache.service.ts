import { getRedisClient } from '@/lib/redis';

/**
 * Cache key patterns
 */
export const CacheKeys = {
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  tenantPages: (tenantId: string) => `tenant:${tenantId}:pages`,
  page: (tenantId: string, slug: string) => `page:${tenantId}:${slug}`,
  pageById: (pageId: string) => `page:id:${pageId}`,
  navigation: (tenantId: string) => `nav:${tenantId}`,
  branding: (tenantId: string) => `branding:${tenantId}`,
  sections: (pageId: string) => `sections:${pageId}`,
  seo: (pageId: string) => `seo:${pageId}`,
  user: (userId: string) => `user:${userId}`,
  apiKey: (keyPrefix: string) => `apikey:${keyPrefix}`,
};

/**
 * Default TTL values (in seconds)
 */
export const CacheTTL = {
  short: 60, // 1 minute
  medium: 300, // 5 minutes
  long: 1800, // 30 minutes
  veryLong: 3600, // 1 hour
};

/**
 * Get cached value
 *
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null; // Cache disabled
  }

  try {
    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    // Redis returns the value directly (already parsed)
    return cached as T;
  } catch (error) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

/**
 * Set cached value
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds (default: 5 minutes)
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttl: number = CacheTTL.medium
): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return; // Cache disabled
  }

  try {
    await redis.set(key, JSON.stringify(value), { ex: ttl });
  } catch (error) {
    console.error('[Cache] Set error:', error);
  }
}

/**
 * Delete cached value
 *
 * @param key - Cache key
 */
export async function deleteCached(key: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    console.error('[Cache] Delete error:', error);
  }
}

/**
 * Delete multiple cached values by pattern
 *
 * @param pattern - Pattern to match (e.g., 'tenant:123:*')
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache] Invalidated ${keys.length} keys matching ${pattern}`);
    }
  } catch (error) {
    console.error('[Cache] Invalidate error:', error);
  }
}

/**
 * Invalidate all cache for a tenant
 *
 * @param tenantId - Tenant ID
 */
export async function invalidateTenantCache(tenantId: string): Promise<void> {
  await invalidateCache(`*:${tenantId}:*`);
  await invalidateCache(`tenant:${tenantId}`);
}

/**
 * Get or set cached value (cache-aside pattern)
 *
 * @param key - Cache key
 * @param fetcher - Function to fetch value if not cached
 * @param ttl - Time to live in seconds
 * @returns Cached or fetched value
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.medium
): Promise<T> {
  // Try cache first
  const cached = await getCached<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch value
  const value = await fetcher();

  // Store in cache
  await setCached(key, value, ttl);

  return value;
}

/**
 * Cache multiple values at once
 *
 * @param entries - Array of [key, value, ttl] tuples
 */
export async function setCachedBulk(
  entries: Array<[string, any, number?]>
): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    // Use pipeline for better performance
    const pipeline = redis.pipeline();

    for (const [key, value, ttl = CacheTTL.medium] of entries) {
      pipeline.set(key, JSON.stringify(value), { ex: ttl });
    }

    await pipeline.exec();
  } catch (error) {
    console.error('[Cache] Bulk set error:', error);
  }
}

/**
 * Check if a key exists in cache
 *
 * @param key - Cache key
 * @returns True if key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error('[Cache] Exists error:', error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  available: boolean;
  keysCount?: number;
  memoryUsage?: string;
}> {
  const redis = getRedisClient();

  if (!redis) {
    return { available: false };
  }

  try {
    const keys = await redis.keys('*');

    return {
      available: true,
      keysCount: keys.length,
    };
  } catch (error) {
    console.error('[Cache] Stats error:', error);
    return { available: false };
  }
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAllCache(): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.flushdb();
    console.log('[Cache] All cache cleared');
  } catch (error) {
    console.error('[Cache] Clear all error:', error);
  }
}
