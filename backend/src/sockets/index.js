import { randomUUID } from "crypto";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js";
import rateLimiter from "../utils/rateLimiter.js";
import { findOpenSession } from "../services/session.service.js";
import { markConnected, markDisconnected } from "../services/presence.service.js";
import { chainRoom, emitToChain, setIo, userRoom } from "./io.js";

const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const CODE_EVENTS = ["code:update", "code:sync-request", "code:sync-reply"];

const readCookie = (header = "", name) => {
  const entry = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));

  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
};

const presencePayload = (session) => ({
  roomCode: session.roomCode,
  graceSeconds: config.RECONNECT_GRACE_SECONDS,
  participants: session.participants.map((p) => ({
    username: p.username,
    connected: p.connected,
    disconnectedAt: p.connected ? null : (p.disconnectedAt ?? null),
  })),
});

// code updates come in quickly while typing, so this counts in memory instead of asking Redis each time
const createLimiter = (max, windowMs) => {
  let count = 0;
  let resetAt = Date.now() + windowMs;

  return () => {
    const now = Date.now();
    if (now > resetAt) {
      count = 0;
      resetAt = now + windowMs;
    }
    return ++count <= max;
  };
};

// every handler answers with an ack and a crash in one never takes the server down
const handle = (fn) => async (payload, ack) => {
  const reply = typeof ack === "function" ? ack : () => {};

  try {
    await fn(payload ?? {}, reply);
  } catch (err) {
    console.error("Socket handler failed:", err.message);
    reply({ ok: false, message: "Something went wrong" });
  }
};

export const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: config.FRONTEND_URL, credentials: true },
    // a real code update is tiny, anything bigger than this is dropped
    maxHttpBufferSize: 262144,
  });

  setIo(io);

  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, "accessToken");
      if (!token) return next(new Error("Not authenticated"));

      const decoded = jwt.verify(token, config.ACCESS_JWT_SECRET);
      const user = await userModel.findById(decoded.id).select("username").lean();
      if (!user) return next(new Error("Not authenticated"));

      socket.data.userId = String(user._id);
      socket.data.username = user.username;
      next();
    } catch {
      // an expired access token lands here too, the client refreshes it and reconnects
      next(new Error("Not authenticated"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, username } = socket.data;
    const allowCodeEvent = createLimiter(200, 1000);

    socket.join(userRoom(userId));

    socket.on(
      "room:join",
      handle(async ({ roomCode }, reply) => {
        const code = String(roomCode ?? "").trim().toUpperCase();
        if (!CODE_PATTERN.test(code)) return reply({ ok: false, message: "Invalid room code" });

        const session = await sessionModel
          .findOne({ roomCode: code, "participants.user": userId })
          .lean();

        // same answer as the REST endpoint, a stranger can't tell a room exists
        if (!session) return reply({ ok: false, message: "Room not found" });

        // a socket follows one room at a time
        if (socket.data.chainId) socket.leave(chainRoom(socket.data.chainId));

        socket.data.chainId = String(session.chainId);
        socket.data.roomCode = code;
        socket.join(chainRoom(session.chainId));

        const updated = await markConnected(code, userId);
        emitToChain(session.chainId, "presence:update", presencePayload(updated));

        reply({ ok: true, roomCode: code });
      }),
    );

    socket.on(
      "chat:send",
      handle(async ({ text }, reply) => {
        if (!socket.data.chainId) return reply({ ok: false, message: "Join a room first" });

        const message = String(text ?? "").trim();
        if (!message || message.length > 500) {
          return reply({ ok: false, message: "Messages must be 1 to 500 characters" });
        }

        const { allowed } = await rateLimiter({
          key: `chat:${userId}`,
          limit: 15,
          windowSeconds: 10,
        });
        if (!allowed) return reply({ ok: false, message: "You are sending messages too quickly" });

        io.to(chainRoom(socket.data.chainId)).emit("chat:message", {
          id: randomUUID(),
          roomCode: socket.data.roomCode,
          username, // taken from the login, never from the client
          text: message,
          at: new Date().toISOString(),
        });

        reply({ ok: true });
      }),
    );

    for (const event of CODE_EVENTS) {
      socket.on(event, (payload) => {
        if (!socket.data.chainId || !allowCodeEvent()) return;
        socket.to(chainRoom(socket.data.chainId)).emit(event, payload);
      });
    }

    socket.on("disconnect", async () => {
      try {
        // another tab from the same person may still be open
        if (io.sockets.adapter.rooms.get(userRoom(userId))?.size) return;

        const open = await findOpenSession(userId);
        const codes = new Set([socket.data.roomCode, open?.roomCode].filter(Boolean));

        for (const code of codes) {
          const session = await markDisconnected(code, userId);
          if (session) emitToChain(session.chainId, "presence:update", presencePayload(session));
        }
      } catch (err) {
        console.error("Disconnect handling failed:", err.message);
      }
    });
  });

  return io;
};