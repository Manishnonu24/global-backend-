export function createDisabledQueue(name, reason = "redis_not_configured") {
  const result = {
    queued: false,
    queue: name,
    reason,
    message: `${name} queue is unavailable because Redis is not configured.`,
  };

  return {
    name,
    isAvailable: false,
    unavailableReason: reason,
    add: async () => result,
    addBulk: async () => result,
    getRepeatableJobs: async () => [],
    removeRepeatableByKey: async () => result,
  };
}

export function isQueueAvailable(queue) {
  return Boolean(queue && queue.isAvailable !== false);
}
