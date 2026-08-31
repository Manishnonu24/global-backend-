import { PHASE_PRODUCTION_BUILD } from "next/constants";
import Redis from "ioredis";

const globalForRedis = globalThis;

const clients = globalForRedis.redisClients || new Map();
if (!globalForRedis.redisClients) {
  globalForRedis.redisClients = clients;
}

const REDIS_UNAVAILABLE_RECHECK_MS = process.env.NODE_ENV === "development" ? 600000 : 30000;

let loggedConnectionError = false;
let unavailableUntil = 0;
let unavailableMessage = null;

export function isRedisConfigured() {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return false;
  if (process.env.DISABLE_BULL_WORKERS === "true" || process.env.DISABLE_REDIS === "true") return false;
  return Boolean(process.env.REDIS_URL?.trim());
}

function getCacheKey({ queue = false, name = "default" } = {}) {
  return `${queue ? "queue" : "web"}:${name}`;
}

export function markRedisUnavailable(message = "Redis is unavailable", retryAfterMs = REDIS_UNAVAILABLE_RECHECK_MS) {
  unavailableMessage = message;
  unavailableUntil = Date.now() + retryAfterMs;
}

export function getRedisUnavailableReason() {
  if (Date.now() >= unavailableUntil) {
    unavailableMessage = null;
    return null;
  }
  return unavailableMessage;
}

export function disconnectRedisClient({ queue = false, name = "default" } = {}) {
  const cacheKey = getCacheKey({ queue, name });
  const client = clients.get(cacheKey);
  if (!client) return;
  clients.delete(cacheKey);
  client.disconnect?.();
}

export function getRedisConnectionOptions({ queue = false } = {}) {
  return {
    lazyConnect: true,
    connectTimeout: 1000,
    commandTimeout: 1000,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: queue ? null : 1,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  };
}

export function getRedisClient({ queue = false, name = "default", ignoreUnavailable = false } = {}) {
  if (!isRedisConfigured() || (!ignoreUnavailable && getRedisUnavailableReason())) {
    return null;
  }

  const cacheKey = getCacheKey({ queue, name });
  if (clients.has(cacheKey)) {
    return clients.get(cacheKey);
  }

  const client = new Redis(process.env.REDIS_URL.trim(), getRedisConnectionOptions({ queue }));
  client.on("error", (error) => {
    if (!loggedConnectionError) {
      loggedConnectionError = true;
      console.warn(`[Redis] Connection unavailable: ${error.message}`);
    }
    markRedisUnavailable(error.message);
    disconnectRedisClient({ queue, name });
  });

  clients.set(cacheKey, client);
  return client;
}

export async function getRedisStatus(timeoutMs = 1000) {
  if (!isRedisConfigured()) {
    return { status: "disabled", configured: false };
  }

  const unavailableReason = getRedisUnavailableReason();
  if (unavailableReason) {
    return { status: "degraded", configured: true, message: unavailableReason };
  }

  const client = getRedisClient({ ignoreUnavailable: true });
  try {
    await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis check timed out")), timeoutMs)),
    ]);
    return { status: "ok", configured: true };
  } catch (error) {
    markRedisUnavailable(error.message);
    disconnectRedisClient();
    return {
      status: "degraded",
      configured: true,
      message: error.message,
    };
  }
}

export const redis = getRedisClient();
