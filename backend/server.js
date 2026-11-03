import mongoose from "mongoose";
import { redisClient } from "./src/config/redis.js";
import {
  emailQueue,
} from "./src/jobs/queues/email.queue.js";
import {
  sessionQueue,
} from "./src/jobs/queues/session.queue.js";
import {
  problemQueue,
} from "./src/jobs/queues/problem.queue.js";

import http from "http";

import config from "./src/config/env.js";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { connectRedis } from "./src/config/redis.js";

await connectDB();
await connectRedis();

// Start workers only after database and Redis are ready
const emailWorkerModule = await import(
  "./src/jobs/workers/email.worker.js"
);
const sessionWorkerModule = await import(
  "./src/jobs/workers/session.worker.js"
);
const problemWorkerModule = await import(
  "./src/jobs/workers/problem.worker.js"
);

import { initSockets } from "./src/sockets/index.js";
import { reconcilePresence } from "./src/services/presence.service.js";



// Reconcile presence after database and Redis connections
await reconcilePresence();

// Create a shared HTTP server for Express and Socket.IO
const server = http.createServer(app);

const io = initSockets(server);

const port = config.PORT || 3000;

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Starting graceful shutdown...`);

  try {
    // Disconnect clients and close the HTTP server
    await new Promise((resolve) => io.close(resolve));

    // Wait for active jobs and stop workers
    await Promise.all([
      emailWorkerModule.emailWorker.close(),
      sessionWorkerModule.sessionWorker.close(),
      problemWorkerModule.problemWorker.close(),
    ]);

    // Close queue connections
    await Promise.all([
      emailQueue.close(),
      sessionQueue.close(),
      problemQueue.close(),
    ]);

    // Close database connections
    if (redisClient.isOpen) await redisClient.quit();
    await mongoose.disconnect();

    console.log("Graceful shutdown completed.");
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));