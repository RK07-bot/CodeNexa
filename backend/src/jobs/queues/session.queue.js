import { Queue } from "bullmq";
import config from "../../config/env.js";
import { redisConnection } from "../../config/redis.js";

// one queue for every room timer, so only one worker has to poll Redis
export const sessionQueue = new Queue("session", { connection: redisConnection });

const options = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 3000,
  },
  removeOnComplete: true,
  removeOnFail: {
    age: 24 * 60 * 60,
    count: 1000,
  },
};

// the person has this long to come back before the room is given up on
export const scheduleGrace = (roomCode, userId) =>
  sessionQueue.add(
    "grace",
    { roomCode, userId: String(userId) },
    {
      ...options,
      delay: config.RECONNECT_GRACE_SECONDS * 1000,
      jobId: `grace-${roomCode}-${userId}`,
    },
  );

export const cancelGrace = async (roomCode, userId) => {
  const job = await sessionQueue.getJob(`grace-${roomCode}-${userId}`);
  // a job that already started can't be removed, the worker checks the room again anyway
  if (job) await job.remove().catch(() => {});
};

export const scheduleExpiry = (roomCode) =>
  sessionQueue.add(
    "expire",
    { roomCode },
    {
      ...options,
      delay: config.WAITING_ROOM_EXPIRY_MINUTES * 60 * 1000,
      jobId: `expire-${roomCode}`,
    },
  );