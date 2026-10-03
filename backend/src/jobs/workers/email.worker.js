import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.js";
import { sendEmail } from "../../services/email.service.js";

// Worker that picks up email jobs from the "email" queue
export const emailWorker = new Worker(
  "email",
  async (job) => {
    // Get the email details stored when the job was added
    const { email, subject, html } = job.data;

    // Send the email
    await sendEmail({ email, subject, html });
  },
  { connection: redisConnection }
);

// Runs when a job fails after BullMQ gives up trying
emailWorker.on("failed", (job, err) => {
  console.error(`Email job ${job.id} failed:`, err.message);
});