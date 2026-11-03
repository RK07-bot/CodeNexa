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
// host/port object, so we build one from the same REDIS_URL
const url = new URL(config.REDIS_URL);

export const redisConnection = {
  host: url.hostname,
  port: Number(url.port),
  username: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,

  // Enable TLS when Redis uses a secure rediss:// connection
  ...(url.protocol === "rediss:" && { tls: {} }),
};