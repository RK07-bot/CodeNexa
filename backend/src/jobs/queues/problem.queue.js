import { Queue } from "bullmq";
import { redisConnection } from "../../config/redis.js";

// AI drafting jobs, a worker takes them one at a time
export const problemQueue = new Queue("problem", { connection: redisConnection });

// a job is never retried by the queue: drafting costs AI calls and code runs, so a
// failure is shown to the admin, who decides whether to try again
export const enqueueAiDraft = (problemId) =>
  problemQueue.add(
    "ai-draft",
    { problemId: String(problemId) },
    {
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 1,
      // the time makes the id new for every try, so "generate again" is never ignored
      jobId: `ai-draft-${problemId}-${Date.now()}`,
    },
  );