import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.js";

// this is just the "mailbox" — controllers drop jobs in here,
// the worker (next file) picks them up separately
export const emailQueue = new Queue("email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 60 * 60, // Keep completed jobs for 1 hour
      count: 1000, // Keep at most 1000 completed jobs
    },
    removeOnFail: {
      age: 24 * 60 * 60, // Keep failed jobs for 24 hours
      count: 5000, // Keep at most 5000 failed jobs
    },
  },
});
