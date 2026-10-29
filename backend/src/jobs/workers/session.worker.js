import { Worker } from "bullmq";
import { redisConnection } from "../../config/redis.js";
import sessionModel from "../../models/session.model.js";
import { closeSession } from "../../services/session.service.js";
import { emitToChain,emitToLobby } from "../../sockets/io.js";

const giveUp = async (session, endReason) => {
  const closed = await closeSession(session, { status: "abandoned", endReason });

  // null means the room was closed some other way first
  if (closed) {
    emitToChain(closed.chainId, "session:updated", {
      roomCode: closed.roomCode,
      status: closed.status,
      endReason,
    });
    if (closed.visibility === "public") emitToLobby();
  }
};

const handlers = {
  grace: async ({ roomCode, userId }) => {
    const session = await sessionModel.findOne({ roomCode, open: true }).lean();
    if (!session) return;

    const person = session.participants.find((p) => String(p.user) === userId);

    // they came back in time
    if (!person || person.connected) return;

    await giveUp(session, "disconnected");
  },

  expire: async ({ roomCode }) => {
    const session = await sessionModel.findOne({ roomCode, open: true, status: "waiting" }).lean();
    if (session) await giveUp(session, "expired");
  },
};

export const sessionWorker = new Worker(
  "session",
  async (job) => handlers[job.name]?.(job.data),
  { connection: redisConnection },
);

sessionWorker.on("failed", (job, err) => {
  console.error(`Session job ${job?.name} failed:`, err.message);
});