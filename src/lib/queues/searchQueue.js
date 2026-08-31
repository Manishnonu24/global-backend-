import { Queue } from "bullmq";
import { getRedisClient } from "../redis";
import { createDisabledQueue, isQueueAvailable } from "./disabledQueue";

const connection = getRedisClient({ queue: true, name: "search-index" });

export const searchQueue = connection
  ? new Queue("search-index", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for inspection
      },
    })
  : createDisabledQueue("search-index");

export async function queueUpsertContent(type, sourceId) {
  if (!isQueueAvailable(searchQueue)) {
    return {
      queued: false,
      reason: searchQueue.unavailableReason,
      type,
      sourceId,
    };
  }

  try {
    await searchQueue.add(
      "upsert-content",
      { type, sourceId },
      { jobId: `upsert:${type}:${sourceId}` } // Idempotent job ID
    );
    return { queued: true, type, sourceId };
  } catch (error) {
    console.error(`[SearchQueue] Failed to queue upsert for ${type}:${sourceId}`, error);
    return { queued: false, reason: "queue_error", error: error.message, type, sourceId };
  }
}

export async function queueDeleteContent(type, sourceId) {
  if (!isQueueAvailable(searchQueue)) {
    return {
      queued: false,
      reason: searchQueue.unavailableReason,
      type,
      sourceId,
    };
  }

  try {
    await searchQueue.add(
      "delete-content",
      { type, sourceId },
      { jobId: `delete:${type}:${sourceId}` } // Idempotent job ID
    );
    return { queued: true, type, sourceId };
  } catch (error) {
    console.error(`[SearchQueue] Failed to queue delete for ${type}:${sourceId}`, error);
    return { queued: false, reason: "queue_error", error: error.message, type, sourceId };
  }
}
