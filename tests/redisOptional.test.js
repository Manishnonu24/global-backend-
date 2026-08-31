import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = vi.hoisted(() => ({
  constructor: vi.fn(function Redis(url, options) {
    this.url = url;
    this.options = options;
    this.on = vi.fn();
    this.ping = vi.fn().mockResolvedValue("PONG");
    this.pipeline = vi.fn();
    this.disconnect = vi.fn();
  }),
}));

vi.mock("ioredis", () => ({
  default: redisMock.constructor,
}));

describe("optional Redis client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.NEXT_PHASE;
  });

  it("does not create a client when REDIS_URL is absent", async () => {
    const { redis, getRedisClient, isRedisConfigured } = await import("@/lib/redis");

    expect(isRedisConfigured()).toBe(false);
    expect(getRedisClient()).toBeNull();
    expect(redis).toBeNull();
    expect(redisMock.constructor).not.toHaveBeenCalled();
  });

  it("creates a bounded web client only when REDIS_URL is configured", async () => {
    process.env.REDIS_URL = "redis://cache.example:6379";

    const { getRedisClient } = await import("@/lib/redis");
    const client = getRedisClient();

    expect(client.url).toBe("redis://cache.example:6379");
    expect(client.options.lazyConnect).toBe(true);
    expect(client.options.enableOfflineQueue).toBe(false);
    expect(client.options.maxRetriesPerRequest).toBe(1);
    expect(redisMock.constructor).toHaveBeenCalledTimes(1);
  });

  it("does not create a client during Next production builds", async () => {
    process.env.REDIS_URL = "redis://cache.example:6379";
    process.env.NEXT_PHASE = "phase-production-build";

    const { redis, getRedisClient, isRedisConfigured } = await import("@/lib/redis");

    expect(isRedisConfigured()).toBe(false);
    expect(getRedisClient()).toBeNull();
    expect(redis).toBeNull();
    expect(redisMock.constructor).not.toHaveBeenCalled();
  });

  it("marks Redis unavailable after a failed health probe", async () => {
    process.env.REDIS_URL = "redis://cache.example:6379";

    const { getRedisClient, getRedisStatus, getRedisUnavailableReason } = await import("@/lib/redis");
    const client = getRedisClient();
    client.ping.mockRejectedValueOnce(new Error("Command timed out"));

    const status = await getRedisStatus();

    expect(status).toEqual({
      status: "degraded",
      configured: true,
      message: "Command timed out",
    });
    expect(client.disconnect).toHaveBeenCalledTimes(1);
    expect(getRedisUnavailableReason()).toBe("Command timed out");
    expect(getRedisClient()).toBeNull();
  });
});
