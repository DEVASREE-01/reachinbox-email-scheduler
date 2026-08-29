import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Enforces per-sender hourly rate limiting using an atomic Redis counter.
 * Returns the status, current count, and when the window resets.
 */
export async function checkAndIncrementRateLimit(
  senderId: string,
  limit: number
): Promise<{ allowed: boolean; count: number; resetTimeMs: number }> {
  const now = new Date();
  
  // Format window key as email-rate:senderId:YYYYMMDDHH
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const windowKey = `email-rate:${senderId}:${year}${month}${day}${hour}`;

  // Calculate millisecond offset until the start of the next hour
  const nextHour = new Date(now);
  nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  const ttlMs = nextHour.getTime() - now.getTime();
  const ttlSeconds = Math.ceil(ttlMs / 1000);

  // Increment atomic counter and set TTL in a single pipeline
  const pipeline = redis.pipeline();
  pipeline.incr(windowKey);
  pipeline.expire(windowKey, ttlSeconds);
  const results = await pipeline.exec();

  if (!results || !results[0]) {
    throw new Error('Redis transaction for rate limit check failed');
  }

  const count = results[0][1] as number;
  const isAllowed = count <= limit;

  return {
    allowed: isAllowed,
    count,
    resetTimeMs: nextHour.getTime(),
  };
}

/**
 * Distributed coordination for minimum delay between emails per sender.
 * Uses an atomic Redis Lua script to reserve slots and avoid concurrency race conditions.
 */
export async function acquireDelaySlot(
  senderId: string,
  minDelayMs: number
): Promise<{ allowed: boolean; remainingMs: number }> {
  const now = Date.now();
  const key = `sender-last-sent:${senderId}`;

  // Lua script checks if the difference between now and the last sent timestamp
  // is less than the minimum delay. If so, it returns the remaining delay needed.
  // Otherwise, it updates the last sent timestamp and returns "OK".
  const luaScript = `
    local last_sent = redis.call('get', KEYS[1])
    local now = tonumber(ARGV[1])
    local delay = tonumber(ARGV[2])
    
    if last_sent then
      local elapsed = now - tonumber(last_sent)
      if elapsed < delay then
        return tostring(delay - elapsed)
      end
    end
    
    redis.call('set', KEYS[1], tostring(now))
    return "OK"
  `;

  try {
    const result = await redis.eval(luaScript, 1, key, String(now), String(minDelayMs));

    if (result === 'OK') {
      return { allowed: true, remainingMs: 0 };
    } else {
      return { allowed: false, remainingMs: Number(result) };
    }
  } catch (error) {
    logger.error({ err: error, senderId }, 'Error running Redis delay slot Lua script');
    // Fail-open or throw? For safety in email scheduling, we throw to trigger job retry
    throw error;
  }
}
