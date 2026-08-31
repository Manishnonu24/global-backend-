import { Queue } from "bullmq";
import { getRedisClient } from "../redis";
import { createDisabledQueue } from "./disabledQueue";

const connection = getRedisClient({ queue: true, name: "webhook-delivery" });

export const webhookQueue = connection
  ? new Queue("webhook-delivery", { connection })
  : createDisabledQueue("webhook-delivery");
