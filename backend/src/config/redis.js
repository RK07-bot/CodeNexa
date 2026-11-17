import { createClient } from "redis";
import config from "./env.js";

export const redisClient = createClient({
  url: config.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

export async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Redis Connected");
    }
  } catch (error) {
    console.error("Redis connection error:", error);
    process.exit(1);
  }
}

// BullMQ doesn't use the same client as above — it wants a plain
// host/port object, so we build one from QUEUE_REDIS_URL
// (same as REDIS_URL unless you set a separate Redis for queues)
const url = new URL(config.QUEUE_REDIS_URL);

export const redisConnection = {
  host: url.hostname,
  port: Number(url.port),
  username: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,

  // Enable TLS when Redis uses a secure rediss:// connection
  ...(url.protocol === "rediss:" && { tls: {} }),
};

// Worker polling settings, shared by all workers.
// BullMQ's defaults (drainDelay 5s, stalledInterval 30s) make every idle worker
// ask Redis for jobs constantly. That is fine on a normal Redis server, but on
// Upstash every one of those calls counts as a billable command.
export const workerOptions = {
  connection: redisConnection,

  // How long an idle worker waits before polling again (seconds).
  // A new job wakes the worker instantly, so this doesn't add delay to jobs.
  drainDelay: 120,

  // How often the worker checks for jobs that crashed mid-run (ms).
  stalledInterval: 10 * 60 * 1000,
};