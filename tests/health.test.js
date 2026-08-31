import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
  },
  getRedisStatus: vi.fn().mockResolvedValue({ status: "disabled", configured: false }),
  isRedisConfigured: vi.fn().mockReturnValue(false),
  getOptionalIntegrationStates: vi.fn(() => ({
    redis: "disabled",
    sentry: "disabled",
    loki: "disabled",
    typesense: "disabled",
    s3: "disabled",
    stripe: "disabled",
    novu: "disabled",
    recaptcha: "disabled",
    flipbook: "disabled",
    email: "disabled",
  })),
}));

vi.mock("@/lib/prisma", () => ({
  default: mocks.prisma,
}));

vi.mock("@/lib/redis", () => ({
  getRedisStatus: mocks.getRedisStatus,
  isRedisConfigured: mocks.isRedisConfigured,
}));

vi.mock("@/lib/integrations/status", () => ({
  getOptionalIntegrationStates: mocks.getOptionalIntegrationStates,
}));

describe("/api/health", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.prisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    mocks.getRedisStatus.mockResolvedValue({ status: "disabled", configured: false });
    mocks.isRedisConfigured.mockReturnValue(false);
  });

  it("returns 200 when DB is available and Redis is disabled", async () => {
    const { GET } = await import("@/app/api/health/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.checks).toEqual({ db: "ok", redis: "disabled" });
  });

  it("returns 503 when DB is unavailable", async () => {
    mocks.prisma.$queryRaw.mockRejectedValueOnce(new Error("DB down"));
    const { GET } = await import("@/app/api/health/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.status).toBe("error");
    expect(json.checks.db).toBe("error");
  });

  it("reports degraded when configured Redis is unavailable without failing readiness", async () => {
    mocks.getRedisStatus.mockResolvedValueOnce({ status: "degraded", configured: true, message: "timeout" });
    mocks.isRedisConfigured.mockReturnValueOnce(true);
    const { GET } = await import("@/app/api/health/route");

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("degraded");
    expect(json.checks.redis).toBe("degraded");
  });
});
