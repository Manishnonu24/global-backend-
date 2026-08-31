import { Queue } from "bullmq";
import { getRedisClient } from "../redis";
import { createDisabledQueue } from "./disabledQueue";

const connection = getRedisClient({ queue: true, name: "system-email" });

export const systemEmailQueue = connection
  ? new Queue("system-email", { connection })
  : createDisabledQueue("system-email");
