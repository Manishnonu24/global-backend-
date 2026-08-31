import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  ensureApplicationState: vi.fn().mockResolvedValue({ ok: true }),
  getRedisStatus: vi.fn().mockResolvedValue({
    status: "degraded",
    configured: true,
    message: "Command timed out",
  }),
  startEmailWorker: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureRequestError: vi.fn(),
  init: vi.fn(),
}));

vi.mock("../sentry.server.config.js", () => ({}));
vi.mock("../sentry.edge.config.js", () => ({}));

vi.mock("../src/lib/logger.js", () => ({
  logger: mocks.logger,
}));

vi.mock("../src/lib/bootstrap/ensureApplicationState.js", () => ({
  ensureApplicationState: mocks.ensureApplicationState,
}));

vi.mock("../src/lib/redis.js", () => ({
  getRedisStatus: mocks.getRedisStatus,
}));

vi.mock("../src/lib/queues/emailWorker.js", () => ({
  startEmailWorker: mocks.startEmailWorker,
}));

describe("instrumentation startup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_RUNTIME = "nodejs";
    delete process.env.NEXT_PHASE;
  });

  it("does not start background workers when configured Redis is unavailable", async () => {
    const { register } = await import("../src/instrumentation.js");

    await register();

    expect(mocks.ensureApplicationState).toHaveBeenCalledTimes(1);
    expect(mocks.getRedisStatus).toHaveBeenCalledTimes(1);
    expect(mocks.startEmailWorker).not.toHaveBeenCalled();
    expect(mocks.logger.info).toHaveBeenCalledWith(
      "[Startup] Redis is unavailable (Command timed out). Background queues are disabled.",
    );
  }, 15000);
});
