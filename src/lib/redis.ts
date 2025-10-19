import { Redis } from '@upstash/redis';

/**
 * Upstash Redis client singleton
 * Use Redis for caching and rate limiting
 */

let redis: Redis | null = null;

/**
 * Get Redis client instance
 * Returns null if Redis is not configured (allows graceful degradation)
 */
export function getRedisClient(): Redis | null {
  // Return null if Redis is not configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Redis] Upstash Redis not configured - caching disabled');
    return null;
  }

  // Create singleton instance
  if (!redis) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('[Redis] Connected to Upstash Redis');
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      return null;
    }
  }

  return redis;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    await client.ping();
    return true;
  } catch (error) {
    console.error('[Redis] Connection test failed:', error);
    return false;
  }
}

export { redis };
