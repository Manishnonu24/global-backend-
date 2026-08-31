import { getRedisClient } from "./redis";

const WINDOW_MS = 1000;
const MEMORY_MAX_KEYS = 5000;
const memoryBuckets = new Map();
let loggedRedisLimiterError = false;

function pruneMemoryBuckets(now) {
  const cutoff = now - WINDOW_MS;
  for (const [key, timestamps] of memoryBuckets) {
    const fresh = timestamps.filter((ts) => ts > cutoff);
    if (fresh.length === 0) {
      memoryBuckets.delete(key);
    } else {
      memoryBuckets.set(key, fresh);
    }
  }

  while (memoryBuckets.size > MEMORY_MAX_KEYS) {
    const oldestKey = memoryBuckets.keys().next().value;
    memoryBuckets.delete(oldestKey);
  }
}

function checkMemoryRateLimit(ip, limitRps) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const key = `ratelimit:${ip || "unknown"}`;

  const current = memoryBuckets.get(key) || [];
  const fresh = current.filter((ts) => ts > cutoff);
  fresh.push(now);
  memoryBuckets.set(key, fresh);

  // Periodic cleanup if map grows
  if (memoryBuckets.size > MEMORY_MAX_KEYS) {
    pruneMemoryBuckets(now);
  }

  return fresh.length <= limitRps;
}

export function resetRateLimiterForTests() {
  memoryBuckets.clear();
  loggedRedisLimiterError = false;
}

export async function checkRateLimit(ip, limitRps = 60) {
  const redis = getRedisClient();
  if (!redis) {
    return checkMemoryRateLimit(ip, limitRps);
  }

  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, 2);
    const results = await pipeline.exec();

    return results[2][1] <= limitRps;
  } catch (error) {
    if (!loggedRedisLimiterError) {
      loggedRedisLimiterError = true;
      console.warn(`[RateLimiter] Redis unavailable. Falling back to memory: ${error.message}`);
    }
    return checkMemoryRateLimit(ip, limitRps);
  }
}

