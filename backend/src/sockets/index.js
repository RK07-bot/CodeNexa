import { randomUUID } from "crypto";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import userModel from "../models/user.model.js";
import sessionModel from "../models/session.model.js";
import rateLimiter from "../utils/rateLimiter.js";
import { findOpenSession } from "../services/session.service.js";
import {
  markConnected,
  markDisconnected,
} from "../services/presence.service.js";
import { chainRoom, emitToChain, setIo, userRoom, LOBBY_ROOM } from "./io.js";

const CODE_PATTERN = /^[A-Z0-9]{6}$/;
const CODE_EVENTS = ["code:update", "code:sync-request", "code:sync-reply"];
const DESCRIPTION_TYPES = ["offer", "answer", "pranswer", "rollback"];

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
  serverTime: new Date().toISOString(),
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

// signals are relayed, so only the known fields get through and nothing else can ride along
const cleanSignal = (payload) => {
  const { call, description, candidate } = payload ?? {};

  // every signal belongs to one call, so a message from an old call can never disturb a new one
  if (typeof call !== "string" || call.length === 0 || call.length > 40) return null;

  const signal = { call };

  if (description) {
    const validType = DESCRIPTION_TYPES.includes(description.type);
    const validSdp =
      typeof description.sdp === "string" && description.sdp.length <= 60000;
    if (!validType || !validSdp) return null;

    signal.description = { type: description.type, sdp: description.sdp };
  }

  if (candidate) {
    if (
      typeof candidate.candidate !== "string" ||
      candidate.candidate.length > 2000
    )
      return null;

    signal.candidate = {
      candidate: candidate.candidate,
      sdpMid: typeof candidate.sdpMid === "string" ? candidate.sdpMid : null,
      sdpMLineIndex: Number.isInteger(candidate.sdpMLineIndex)
        ? candidate.sdpMLineIndex
        : null,
      usernameFragment:
        typeof candidate.usernameFragment === "string"
          ? candidate.usernameFragment
          : null,
    };
  }

  return signal.description || signal.candidate ? signal : null;
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
      const user = await userModel
        .findById(decoded.id)
        .select("username")
        .lean();
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
    const allowRtcEvent = createLimiter(100, 1000);

    // the chain this socket is really in right now, a takeover removes it from the room
    const activeChain = () => {
      const { chainId } = socket.data;
      return chainId && socket.rooms.has(chainRoom(chainId)) ? chainId : null;
    };

    socket.join(userRoom(userId));

    socket.on(
      "room:join",
      handle(async ({ roomCode }, reply) => {
        const code = String(roomCode ?? "")
          .trim()
          .toUpperCase();
        if (!CODE_PATTERN.test(code))
          return reply({ ok: false, message: "Invalid room code" });

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

        // opening the room somewhere else takes over this person's seat
        const inRoom = await io.in(chainRoom(session.chainId)).fetchSockets();
        for (const other of inRoom) {
          if (other.id !== socket.id && other.data.userId === userId) {
            other.emit("room:taken-over", { roomCode: code });
            other.leave(chainRoom(session.chainId));
          }
        }

        const updated = await markConnected(code, userId);
        emitToChain(
          session.chainId,
          "presence:update",
          presencePayload(updated),
        );

        reply({ ok: true, roomCode: code });
      }),
    );

    // leaving the room page counts as leaving the call, the grace period starts from here
    socket.on(
      "room:leave",
      handle(async (_payload, reply) => {
        const { chainId, roomCode } = socket.data;
        if (!chainId) return reply({ ok: true });

        socket.leave(chainRoom(chainId));
        socket.data.chainId = null;
        socket.data.roomCode = null;

        // another tab of the same person may still be in the room
        const inRoom = await io.in(chainRoom(chainId)).fetchSockets();

        if (!inRoom.some((s) => s.data.userId === userId)) {
          const session = await markDisconnected(roomCode, userId);
          if (session)
            emitToChain(
              session.chainId,
              "presence:update",
              presencePayload(session),
            );
        }

        reply({ ok: true });
      }),
    );

    socket.on("lobby:subscribe", () => socket.join(LOBBY_ROOM));
    socket.on("lobby:unsubscribe", () => socket.leave(LOBBY_ROOM));

    socket.on(
      "chat:send",
      handle(async ({ text }, reply) => {
        const chainId = activeChain();
        if (!chainId) return reply({ ok: false, message: "Join a room first" });

        const message = String(text ?? "").trim();
        if (!message || message.length > 500) {
          return reply({
            ok: false,
            message: "Messages must be 1 to 500 characters",
          });
        }

        const { allowed } = await rateLimiter({
          key: `chat:${userId}`,
          limit: 15,
          windowSeconds: 10,
        });
        if (!allowed)
          return reply({
            ok: false,
            message: "You are sending messages too quickly",
          });

        io.to(chainRoom(chainId)).emit("chat:message", {
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
        const chainId = activeChain();
        if (!chainId || !allowCodeEvent()) return;
        socket.to(chainRoom(chainId)).emit(event, payload);
      });
    }

    // offers, answers and ICE candidates for the video call, passed to the other person untouched
    socket.on("rtc:signal", (payload) => {
      const chainId = activeChain();
      if (!chainId || !allowRtcEvent()) return;

      const signal = cleanSignal(payload);
      if (signal) socket.to(chainRoom(chainId)).emit("rtc:signal", signal);
    });

    // a browser that has no working call asks the other side for one
    socket.on("rtc:ready", () => {
      const chainId = activeChain();
      if (!chainId || !allowRtcEvent()) return;

      socket.to(chainRoom(chainId)).emit("rtc:ready");
    });

    // the other side can't tell a muted mic from silence, so each browser announces its own state
    socket.on("media:state", (payload) => {
      const chainId = activeChain();
      if (!chainId || !allowRtcEvent()) return;

      socket.to(chainRoom(chainId)).emit("media:state", {
        audio: Boolean(payload?.audio),
        video: Boolean(payload?.video),
        screen: Boolean(payload?.screen),
      });
    });

    socket.on("disconnect", async () => {
      try {
        // another tab from the same person may still be open
        if (io.sockets.adapter.rooms.get(userRoom(userId))?.size) return;

        const open = await findOpenSession(userId);
        const codes = new Set(
          [socket.data.roomCode, open?.roomCode].filter(Boolean),
        );

        for (const code of codes) {
          const session = await markDisconnected(code, userId);
          if (session)
            emitToChain(
              session.chainId,
              "presence:update",
              presencePayload(session),
            );
        }
      } catch (err) {
        console.error("Disconnect handling failed:", err.message);
      }
    });
  });

  return io;
};