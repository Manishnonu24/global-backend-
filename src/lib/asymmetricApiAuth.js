import { importSPKI, jwtVerify, decodeProtectedHeader } from "jose";
import prisma from "@/lib/prisma";
import { getRedisClient, isRedisConfigured } from "@/lib/redis";
import { NextResponse } from "next/server";

export function areLegacyIntegrationKeysAllowed() {
  return process.env.ALLOW_LEGACY_INTEGRATION_KEYS !== "false";
}

/**
 * Verifies an RS256 JWT using public keys stored in the database.
 */
export async function verifyAsymmetricJwt(token, options = {}) {
  const { expectedAudience = "global-backend", maxAgeSeconds = 300 } = options;

  if (!token || typeof token !== "string") {
    return { status: 401, error: "Missing or invalid token" };
  }

  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch (_) {
    return { status: 401, error: "Invalid token header" };
  }

  if (!header || header.alg !== "RS256") {
    return { status: 401, error: "Only RS256 is accepted" };
  }

  const kid = header.kid;
  if (!kid) {
    return { status: 401, error: "Missing kid in token header" };
  }

  let keyRecord;
  try {
    keyRecord = await prisma.integrationpublickey.findUnique({
      where: { keyId: kid },
      include: { frontendProject: true },
    });
  } catch (err) {
    return { status: 500, error: "Database error retrieving key" };
  }

  if (!keyRecord) {
    return { status: 401, error: "Unknown or unregistered key ID" };
  }

  if (!keyRecord.isActive || keyRecord.revokedAt) {
    return { status: 401, error: "Public key has been revoked" };
  }

  if (!keyRecord.frontendProject || !keyRecord.frontendProject.isActive) {
    return { status: 401, error: "Frontend project is inactive or unavailable" };
  }

  let cryptoKey;
  try {
    cryptoKey = await importSPKI(keyRecord.publicKey, "RS256");
  } catch (_) {
    return { status: 401, error: "Failed to parse public key" };
  }

  let payload;
  try {
    const verified = await jwtVerify(token, cryptoKey, {
      audience: expectedAudience,
      algorithms: ["RS256"],
    });
    payload = verified.payload;
  } catch (err) {
    if (err.code === "ERR_JWT_EXPIRED") {
      return { status: 401, error: "Token has expired" };
    }
    if (err.code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
      return { status: 403, error: "Audience or claim validation failed" };
    }
    return { status: 401, error: "Invalid token signature" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.iat && payload.exp && payload.exp - payload.iat > maxAgeSeconds) {
    return { status: 401, error: "Token lifetime exceeds maximum allowed duration" };
  }

  if (payload.iss !== keyRecord.clientId) {
    return { status: 403, error: "Token issuer does not match key client" };
  }

  if (payload.sub !== keyRecord.siteId) {
    return { status: 403, error: "Token subject does not match key site" };
  }

  if (keyRecord.frontendProject.siteId !== keyRecord.siteId) {
    return { status: 403, error: "Project does not belong to the target site" };
  }

  return {
    authenticated: true,
    clientId: keyRecord.clientId,
    siteId: keyRecord.siteId,
    keyId: keyRecord.keyId,
    tokenId: payload.jti || null,
    jti: payload.jti || null,
    payload,
  };
}

/**
 * Checks replay protection and validates Bearer token on an incoming Request.
 */
export async function verifyAsymmetricApiRequest(req, options = {}) {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { authenticated: false, status: 401, error: "Missing Bearer token" };
  }

  const token = match[1].trim();
  const result = await verifyAsymmetricJwt(token, options);
  if (!result.authenticated) {
    return { authenticated: false, ...result };
  }

  const method = req.method ? req.method.toUpperCase() : "GET";
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isMutation) {
    if (!result.jti) {
      return { authenticated: false, status: 401, error: "Mutation requests require a unique jti claim" };
    }

    const redis = getRedisClient();
    const isConfigured = isRedisConfigured();

    if (!redis || !isConfigured) {
      return { authenticated: false, status: 503, error: "Authentication service temporarily unavailable" };
    }

    try {
      const remainingTtl = Math.max(1, (result.payload.exp || Math.floor(Date.now() / 1000) + 300) - Math.floor(Date.now() / 1000));
      const res = await redis.set(`auth:jti:${result.jti}`, "1", "NX", "EX", remainingTtl);
      if (!res) {
        return { authenticated: false, status: 401, error: "Token has already been used" };
      }
    } catch (_) {
      return { authenticated: false, status: 503, error: "Authentication service temporarily unavailable" };
    }
  }

  return { authenticated: true, ...result };
}

/**
 * Precedence router: Bearer token is strictly evaluated without fallback.
 * If no Bearer header is present, fallback to legacy key if allowed.
 */
export async function resolveIntegrationAuth(req, options = {}) {
  const authHeader = req.headers.get("authorization") || "";
  const hasBearer = /^Bearer\s+/i.test(authHeader);

  if (hasBearer) {
    const res = await verifyAsymmetricApiRequest(req, options);
    if (!res.authenticated) {
      return {
        authenticated: false,
        status: res.status,
        error: res.error,
        response: NextResponse.json({ success: false, error: res.error }, { status: res.status }),
      };
    }
    return { authenticated: true, authType: "asymmetric_jwt", ...res };
  }

  if (!areLegacyIntegrationKeysAllowed()) {
    return {
      authenticated: false,
      status: 401,
      error: "Legacy integration keys are disabled. Use RS256 Bearer tokens.",
      response: NextResponse.json({ success: false, error: "Legacy integration keys are disabled" }, { status: 401 }),
    };
  }

  const legacyKey =
    options.legacyKey ||
    req.headers.get("x-integration-key") ||
    req.headers.get("x-api-key") ||
    null;

  if (!legacyKey) {
    return {
      authenticated: false,
      status: 401,
      error: "Missing authorization credentials",
      response: NextResponse.json({ success: false, error: "Missing authorization credentials" }, { status: 401 }),
    };
  }

  let proj = null;
  try {
    proj = await prisma.frontendProject.findUnique({
      where: { apiKey: legacyKey },
    });
  } catch (_) {
    try {
      proj = await prisma.frontendProject.findFirst({
        where: { apiKey: legacyKey, isActive: true },
      });
    } catch (__) {}
  }

  if (!proj || !proj.isActive) {
    return {
      authenticated: false,
      status: 401,
      error: "Invalid integration key",
      response: NextResponse.json({ success: false, error: "Invalid integration key" }, { status: 401 }),
    };
  }

  return { authenticated: true, authType: "legacy_key", siteId: proj.siteId, clientId: proj.id, project: proj };
}
