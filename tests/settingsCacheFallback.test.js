import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRedisClient: vi.fn(() => null),
  settingsRepository: {
    findBySiteId: vi.fn().mockResolvedValue({
      siteId: "AHP",
      websiteSettings: { title: "A Health Place" },
    }),
    upsertSettings: vi.fn(),
  },
}));

vi.mock("@/lib/redis", () => ({
  getRedisClient: mocks.getRedisClient,
}));

vi.mock("@/repositories/settings.repository", () => ({
  settingsRepository: mocks.settingsRepository,
}));

vi.mock("@/core/service", () => ({
  BaseService: class BaseService {
    constructor(repository) {
      this.repository = repository;
    }
  },
}));

vi.mock("@/core/errors", () => ({
  ValidationError: class ValidationError extends Error {},
}));

vi.mock("@/core/events", () => ({
  EventBus: { emit: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  logAction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {},
}));

vi.mock("@/lib/validators/cta", () => ({
  CtaConfigSchema: {
    safeParse: vi.fn((data) => ({ success: true, data })),
  },
}));

describe("settings cache fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads settings directly when Redis is absent", async () => {
    const { settingsService } = await import("@/services/settings.service");

    const value = await settingsService.getSettingsField("AHP", "websiteSettings");

    expect(value).toEqual({ title: "A Health Place" });
    expect(mocks.getRedisClient).toHaveBeenCalled();
    expect(mocks.settingsRepository.findBySiteId).toHaveBeenCalledWith("AHP");
  });
});
