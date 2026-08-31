import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimiterForTests } from "@/lib/rateLimiter";

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

describe("rate limiter Redis fallback", () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    resetRateLimiterForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces the same boolean contract with in-memory storage", async () => {
    expect(await checkRateLimit("127.0.0.1", 2)).toBe(true);
    expect(await checkRateLimit("127.0.0.1", 2)).toBe(true);
    expect(await checkRateLimit("127.0.0.1", 2)).toBe(false);
  });

  it("expires old in-memory entries", async () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(1000);

    expect(await checkRateLimit("10.0.0.1", 1)).toBe(true);
    expect(await checkRateLimit("10.0.0.1", 1)).toBe(false);

    now.mockReturnValue(2101);
    expect(await checkRateLimit("10.0.0.1", 1)).toBe(true);
  });
});
