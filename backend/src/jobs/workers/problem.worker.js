import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.js";
import { draftWithAi, failDraft, sweepStale } from "../../services/aidraft.service.js";

const SWEEP_EVERY_MS = 10 * 60 * 1000;

export const problemWorker = new Worker(
  "problem",
  async (job) => {
    if (job.name === "ai-draft") await draftWithAi(job.data);
  },
  // drafting is slow and uses the shared code runner, so one problem at a time
  { connection: redisConnection, concurrency: 1, lockDuration: 60_000 },
);

problemWorker.on("failed", async (job, err) => {
  console.error(`Problem job ${job?.name} failed:`, err.message);

  if (job?.data?.problemId) {
    await failDraft(job.data.problemId, "Drafting stopped unexpectedly. Try again.").catch(() => {});
  }
});

const sweep = () =>
  sweepStale().catch((err) =>
    console.error("Could not clean up stuck AI drafts:", err.message),
  );

sweep();
setInterval(sweep, SWEEP_EVERY_MS).unref();