/**
 * GET /api/health
 *
 * Backward-compatible public health endpoint. Database availability controls
 * the HTTP status. Optional integrations report ok/disabled/degraded without
 * making a first-run instance unhealthy.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRedisStatus, isRedisConfigured } from "@/lib/redis";
import { getOptionalIntegrationStates } from "@/lib/integrations/status";

const TIMEOUT_MS = 3000;

function withTimeout(promise, ms, failureMsg) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(failureMsg));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export async function getHealthPayload() {
  const checks = { db: "error", redis: "disabled" };
  const integrations = getOptionalIntegrationStates();
  let dbMessage = null;
  let redisMessage = null;

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, TIMEOUT_MS, "DB check timed out");
    checks.db = "ok";
  } catch (err) {
    dbMessage = err.message;
  }

  const redis = await getRedisStatus(TIMEOUT_MS);
  checks.redis = redis.status;
  integrations.redis = redis.status;
  if (redis.message) redisMessage = redis.message;

  let status = "ok";
  if (checks.db !== "ok") {
    status = "error";
  } else if (isRedisConfigured() && checks.redis !== "ok") {
    status = "degraded";
  }

  return {
    status,
    checks,
    integrations,
    details: {
      db: dbMessage,
      redis: redisMessage,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function GET() {
  const payload = await getHealthPayload();
  return NextResponse.json(payload, { status: payload.checks.db === "ok" ? 200 : 503 });
}
