import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.js";

// this is just the "mailbox" — controllers drop jobs in here,
// the worker (next file) picks them up separately
export const emailQueue = new Queue("email", { connection: redisConnection });