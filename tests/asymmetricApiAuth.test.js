import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateKeyPair, exportSPKI, SignJWT } from "jose";
import {
  verifyAsymmetricJwt,
  verifyAsymmetricApiRequest,
  resolveIntegrationAuth,
  areLegacyIntegrationKeysAllowed,
} from "@/lib/asymmetricApiAuth";

// Hoist mock setup
const prismaMock = vi.hoisted(() => ({
  integrationpublickey: {
    findUnique: vi.fn(),
  },
  frontendProject: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  apiKey: {
    findFirst: vi.fn(),
  },
  site: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

const mockRedisStore = new Map();
let mockRedisAvailable = true;

const redisMock = vi.hoisted(() => ({
  getRedisClient: vi.fn(() => {
    if (!mockRedisAvailable) return null;
    return {
      set: vi.fn(async (key, val, mode1, mode2, ttl) => {
        if (mode1 === "NX") {
          if (mockRedisStore.has(key)) {
            return null; // Key already exists (Replay)
          }
          mockRedisStore.set(key, val);
          return "OK";
        }
        mockRedisStore.set(key, val);
        return "OK";
      }),
      get: vi.fn(async (key) => mockRedisStore.get(key) || null),
    };
  }),
  isRedisConfigured: vi.fn(() => mockRedisAvailable),
}));

vi.mock("@/lib/redis", () => ({
  getRedisClient: redisMock.getRedisClient,
  isRedisConfigured: redisMock.isRedisConfigured,
}));

describe("RS256 Asymmetric API Authentication", () => {
  let validKeyPair;
  let anotherKeyPair;
  let validPublicKeySpki;
  const testKid = "key_test_2026_01";
  const testClientId = "proj_client_123";
  const testSiteId = "site_ahp_main";

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRedisStore.clear();
    mockRedisAvailable = true;
    delete process.env.ALLOW_LEGACY_INTEGRATION_KEYS;

    // Generate fresh RSA 2048 keypairs for testing
    validKeyPair = await generateKeyPair("RS256", { modulusLength: 2048 });
    anotherKeyPair = await generateKeyPair("RS256", { modulusLength: 2048 });
    validPublicKeySpki = await exportSPKI(validKeyPair.publicKey);

    // Default mock setup: active valid key
    prismaMock.integrationpublickey.findUnique.mockResolvedValue({
      id: "ipk_1",
      keyId: testKid,
      clientId: testClientId,
      siteId: testSiteId,
      publicKey: validPublicKeySpki,
      algorithm: "RS256",
      isActive: true,
      revokedAt: null,
      frontendProject: {
        id: testClientId,
        siteId: testSiteId,
        isActive: true,
      },
    });
  });

  // Helper to build test JWTs
  async function createTestJwt({
    keyPair = validKeyPair,
    kid = testKid,
    alg = "RS256",
    iss = testClientId,
    sub = testSiteId,
    aud = "global-backend",
    jti = `jti_${Date.now()}_${Math.random()}`,
    iat = Math.floor(Date.now() / 1000),
    exp = Math.floor(Date.now() / 1000) + 120, // 2 minutes
  } = {}) {
    return new SignJWT({ jti })
      .setProtectedHeader({ alg, kid, typ: "JWT" })
      .setIssuer(iss)
      .setSubject(sub)
      .setAudience(aud)
      .setIssuedAt(iat)
      .setExpirationTime(exp)
      .sign(keyPair.privateKey);
  }

  it("1. Valid RS256 token succeeds", async () => {
    const jwt = await createTestJwt();
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBe(true);
    expect(result.siteId).toBe(testSiteId);
    expect(result.clientId).toBe(testClientId);
    expect(result.keyId).toBe(testKid);
  });

  it("2. Invalid Bearer token is rejected and NEVER falls back to legacy key", async () => {
    const invalidJwt = "invalid.bearer.token";
    const req = new Request("http://localhost:3000/api/integrations/test", {
      headers: {
        authorization: `Bearer ${invalidJwt}`,
        "x-integration-key": "legacy_valid_key_123",
      },
    });

    const result = await resolveIntegrationAuth(req, { siteId: testSiteId });
    expect(result.authenticated).toBe(false);
    expect(result.status).toBe(401);
    // Verified that legacy key lookup was never attempted
    expect(prismaMock.frontendProject.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.apiKey.findFirst).not.toHaveBeenCalled();
  });

  it("3. Missing Bearer + valid legacy key succeeds when ALLOW_LEGACY_INTEGRATION_KEYS is undefined (default)", async () => {
    expect(areLegacyIntegrationKeysAllowed()).toBe(true);

    prismaMock.frontendProject.findUnique.mockResolvedValueOnce({
      id: "legacy_proj_1",
      siteId: testSiteId,
      isActive: true,
      apiKey: "legacy_valid_key_123",
    });

    const req = new Request("http://localhost:3000/api/integrations/test", {
      headers: {
        "x-integration-key": "legacy_valid_key_123",
      },
    });

    const result = await resolveIntegrationAuth(req, { siteId: testSiteId });
    expect(result.authenticated).toBe(true);
    expect(result.authType).toBe("legacy_key");
    expect(result.siteId).toBe(testSiteId);
  });

  it("4. Missing Bearer + valid legacy key succeeds when ALLOW_LEGACY_INTEGRATION_KEYS='true'", async () => {
    process.env.ALLOW_LEGACY_INTEGRATION_KEYS = "true";
    expect(areLegacyIntegrationKeysAllowed()).toBe(true);

    prismaMock.frontendProject.findUnique.mockResolvedValueOnce({
      id: "legacy_proj_1",
      siteId: testSiteId,
      isActive: true,
      apiKey: "legacy_valid_key_123",
    });

    const req = new Request("http://localhost:3000/api/integrations/test", {
      headers: {
        "x-integration-key": "legacy_valid_key_123",
      },
    });

    const result = await resolveIntegrationAuth(req, { siteId: testSiteId });
    expect(result.authenticated).toBe(true);
    expect(result.authType).toBe("legacy_key");
  });

  it("5. Missing Bearer + legacy key rejected when ALLOW_LEGACY_INTEGRATION_KEYS='false'", async () => {
    process.env.ALLOW_LEGACY_INTEGRATION_KEYS = "false";
    expect(areLegacyIntegrationKeysAllowed()).toBe(false);

    const req = new Request("http://localhost:3000/api/integrations/test", {
      headers: {
        "x-integration-key": "legacy_valid_key_123",
      },
    });

    const result = await resolveIntegrationAuth(req, { siteId: testSiteId });
    expect(result.authenticated).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toContain("Legacy integration keys are disabled");
  });

  it("6. Expired token is rejected (401)", async () => {
    const expiredJwt = await createTestJwt({
      iat: Math.floor(Date.now() / 1000) - 400,
      exp: Math.floor(Date.now() / 1000) - 100, // Expired 100s ago
    });

    const result = await verifyAsymmetricJwt(expiredJwt);
    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("expired");
  });

  it("7. Token lifetime > 5 minutes is rejected (401)", async () => {
    const longLivedJwt = await createTestJwt({
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes lifetime
    });

    const result = await verifyAsymmetricJwt(longLivedJwt);
    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("maximum allowed duration");
  });

  it("8. Wrong private key / signature is rejected (401)", async () => {
    const badSigJwt = await createTestJwt({ keyPair: anotherKeyPair });
    const result = await verifyAsymmetricJwt(badSigJwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("Invalid token signature");
  });

  it("9. Unknown kid is rejected (401)", async () => {
    prismaMock.integrationpublickey.findUnique.mockResolvedValueOnce(null);

    const jwt = await createTestJwt({ kid: "unknown_kid_999" });
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("Unknown or unregistered key ID");
  });

  it("10. Revoked key is rejected (401)", async () => {
    prismaMock.integrationpublickey.findUnique.mockResolvedValueOnce({
      id: "ipk_revoked",
      keyId: testKid,
      clientId: testClientId,
      siteId: testSiteId,
      publicKey: validPublicKeySpki,
      algorithm: "RS256",
      isActive: true,
      revokedAt: new Date(), // Revoked
      frontendProject: { id: testClientId, siteId: testSiteId, isActive: true },
    });

    const jwt = await createTestJwt();
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("revoked");
  });

  it("11. Inactive frontend project is rejected (401)", async () => {
    prismaMock.integrationpublickey.findUnique.mockResolvedValueOnce({
      id: "ipk_1",
      keyId: testKid,
      clientId: testClientId,
      siteId: testSiteId,
      publicKey: validPublicKeySpki,
      algorithm: "RS256",
      isActive: true,
      revokedAt: null,
      frontendProject: { id: testClientId, siteId: testSiteId, isActive: false }, // Inactive project
    });

    const jwt = await createTestJwt();
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("inactive or unavailable");
  });

  it("12. Client / Issuer mismatch is rejected (403)", async () => {
    const jwt = await createTestJwt({ iss: "wrong_client_id" });
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(403);
    expect(result.error).toContain("Token issuer does not match");
  });

  it("13. Site / Subject mismatch is rejected (403)", async () => {
    const jwt = await createTestJwt({ sub: "wrong_site_id" });
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(403);
    expect(result.error).toContain("Token subject does not match");
  });

  it("14. Project site vs Key site mismatch is rejected (403)", async () => {
    prismaMock.integrationpublickey.findUnique.mockResolvedValueOnce({
      id: "ipk_1",
      keyId: testKid,
      clientId: testClientId,
      siteId: testSiteId,
      publicKey: validPublicKeySpki,
      algorithm: "RS256",
      isActive: true,
      revokedAt: null,
      frontendProject: { id: testClientId, siteId: "other_mismatched_site", isActive: true },
    });

    const jwt = await createTestJwt();
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(403);
    expect(result.error).toContain("does not belong to the target site");
  });

  it("15. Invalid audience is rejected (403)", async () => {
    const jwt = await createTestJwt({ aud: "wrong-audience" });
    const result = await verifyAsymmetricJwt(jwt);

    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(403);
    expect(result.error).toContain("claim validation failed");
  });

  it("16. alg=none is rejected (401)", async () => {
    // Unsigned alg: none token
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT", kid: testKid })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: testClientId,
        sub: testSiteId,
        aud: "global-backend",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 120,
      })
    ).toString("base64url");
    const unsignedJwt = `${header}.${payload}.`;

    const result = await verifyAsymmetricJwt(unsignedJwt);
    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("Only RS256 is accepted");
  });

  it("17. Non-RS256 (HS256) is rejected (401)", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT", kid: testKid })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: testClientId,
        sub: testSiteId,
        aud: "global-backend",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 120,
      })
    ).toString("base64url");
    const hs256Jwt = `${header}.${payload}.mockSignature`;

    const result = await verifyAsymmetricJwt(hs256Jwt);
    expect(result.authenticated).toBeUndefined();
    expect(result.status).toBe(401);
    expect(result.error).toContain("Only RS256 is accepted");
  });

  it("18. First mutation jti succeeds", async () => {
    const jwt = await createTestJwt({ jti: "unique_jti_001" });
    const req = new Request("http://localhost:3000/api/integrations/manifest", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
    });

    const result = await verifyAsymmetricApiRequest(req);
    expect(result.authenticated).toBe(true);
    expect(result.tokenId).toBe("unique_jti_001");
  });

  it("19. Reused mutation jti is rejected as replay (401)", async () => {
    const jwt = await createTestJwt({ jti: "replayed_jti_002" });
    const req1 = new Request("http://localhost:3000/api/integrations/manifest", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
    });

    // First request succeeds
    const result1 = await verifyAsymmetricApiRequest(req1);
    expect(result1.authenticated).toBe(true);

    // Second request with same JWT / jti fails as replay
    const req2 = new Request("http://localhost:3000/api/integrations/manifest", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
    });
    const result2 = await verifyAsymmetricApiRequest(req2);
    expect(result2.authenticated).toBe(false);
    expect(result2.status).toBe(401);
    expect(result2.error).toContain("already been used");
  });

  it("20. New unique jti succeeds on mutation request", async () => {
    const jwt1 = await createTestJwt({ jti: "jti_seq_1" });
    const req1 = new Request("http://localhost:3000/api/integrations/manifest", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt1}` },
    });
    const res1 = await verifyAsymmetricApiRequest(req1);
    expect(res1.authenticated).toBe(true);

    const jwt2 = await createTestJwt({ jti: "jti_seq_2" });
    const req2 = new Request("http://localhost:3000/api/integrations/manifest", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt2}` },
    });
    const res2 = await verifyAsymmetricApiRequest(req2);
    expect(res2.authenticated).toBe(true);
  });

  it("21. Redis unavailable during mutation replay check returns 503 Service Unavailable", async () => {
    mockRedisAvailable = false; // Simulate Redis outage

    const jwt = await createTestJwt({ jti: "jti_redis_down_001" });
    const req = new Request("http://localhost:3000/api/integrations/manifest", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
    });

    const result = await verifyAsymmetricApiRequest(req);
    expect(result.authenticated).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toBe("Authentication service temporarily unavailable");
  });
});
