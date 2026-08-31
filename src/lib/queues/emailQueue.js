import { Queue } from "bullmq";
import { getRedisClient } from "../redis";
import { createDisabledQueue } from "./disabledQueue";

const connection = getRedisClient({ queue: true, name: "email-campaign" });

export const emailQueue = connection
  ? new Queue("email-campaign", { connection })
  : createDisabledQueue("email-campaign");
