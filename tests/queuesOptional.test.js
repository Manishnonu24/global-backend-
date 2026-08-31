import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  getRedisClient: vi.fn(() => null),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(),
  Worker: vi.fn(),
}));

describe("queue modules without Redis", () => {
  it("exports disabled queues instead of constructing BullMQ queues", async () => {
    const { Queue } = await import("bullmq");
    const { emailQueue } = await import("@/lib/queues/emailQueue");
    const { queueUpsertContent } = await import("@/lib/queues/searchQueue");

    expect(Queue).not.toHaveBeenCalled();
    expect(emailQueue.isAvailable).toBe(false);

    await expect(emailQueue.add("job", {})).resolves.toMatchObject({
      queued: false,
      reason: "redis_not_configured",
    });

    await expect(queueUpsertContent("page", "page-1")).resolves.toMatchObject({
      queued: false,
      reason: "redis_not_configured",
      type: "page",
      sourceId: "page-1",
    });
  });
});
