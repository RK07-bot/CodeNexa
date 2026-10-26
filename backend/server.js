
import http from "http";

import config from "./src/config/env.js";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { connectRedis } from "./src/config/redis.js";

import "./src/jobs/workers/email.worker.js";
import "./src/jobs/workers/session.worker.js";

import { initSockets } from "./src/sockets/index.js";
import { reconcilePresence } from "./src/services/presence.service.js";

await connectDB();
await connectRedis();

// Reconcile presence after database and Redis connections
await reconcilePresence();

// Create a shared HTTP server for Express and Socket.IO
const server = http.createServer(app);

initSockets(server);

const port = config.PORT || 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
