import { z } from "zod";
import config from "../config/env.js";
import tryCatch from "../middlewares/try-catch.middleware.js";
import problemModel from "../models/problem.model.js";
import sessionModel from "../models/session.model.js";
import rateLimiter from "../utils/rateLimiter.js";
import escapeRegex from "../utils/escapeRegex.js";
import {
  closeSession,
  createSessionDoc,
  findOpenSession,
  isDuplicateOn,
} from "../services/session.service.js";
import {
  createSessionSchema,
  listPublicQuerySchema,
  nextSessionSchema,
} from "../validators/session.validator.js";
import { emitToChain, emitToLobby } from "../sockets/io.js";
import { scheduleExpiry, scheduleGrace } from "../jobs/queues/session.queue.js";

const logTimerError = (err) =>
  console.error("Could not schedule a room timer:", err.message);

const CODE_PATTERN = /^[A-Z0-9]{6}$/;

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const invalid = (res, error) =>
  fail(res, 400, "Invalid request", {
    errors: z.flattenError(error).fieldErrors,
  });

const alreadyInRoom = (res, room) =>
  fail(
    res,
    409,
    "You are already in an open room. Leave it before starting another.",
    {
      alreadyInRoom: true,
      roomCode: room?.roomCode ?? null,
    },
  );

const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const findRoom = (code) =>
  CODE_PATTERN.test(code)
    ? sessionModel.findOne({ roomCode: code }).lean()
    : null;

const isMember = (room, userId) =>
  room.participants.some((p) => String(p.user) === String(userId));

// private rooms are protected by their code, so looking codes up is rate limited
const lookupAllowed = async (userId) => {
  const { allowed } = await rateLimiter({
    key: `room-lookup:${userId}`,
    limit: 20,
    windowSeconds: 60,
  });
  return allowed;
};

const serialize = (room, userId) => {
  const me = room.participants.find((p) => String(p.user) === String(userId));

  const view = {
    roomCode: room.roomCode,
    problem: room.problemInfo,
    visibility: room.visibility,
    status: room.status,
    createdAt: room.createdAt,
    host: { username: room.hostUsername },
    participantCount: room.participants.length,
    startedAt: room.startedAt ?? null,
    endedAt: room.endedAt ?? null,
    endReason: room.endReason ?? null,
    durationSeconds: room.durationSeconds,
    isParticipant: Boolean(me),
    isHost: me?.role === "host",
  };

  // member details are only for people who are actually in the room
  if (!me) return view;

  return {
    ...view,
    chainId: room.chainId,
    nextRoomCode: room.nextRoomCode ?? null,
    stats: room.stats,
    participants: room.participants.map((p) => ({
      username: p.username,
      role: p.role,
      connected: p.connected,
    })),
  };
};

export const createSession = tryCatch(async (req, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);

  const userId = req.user._id;

  const { allowed } = await rateLimiter({
    key: `create-room:${userId}`,
    limit: 5,
    windowSeconds: 60,
  });
  if (!allowed)
    return fail(
      res,
      429,
      "You are creating rooms too quickly. Wait a moment and try again.",
    );

  const problem = await problemModel
    .findOne({ slug: parsed.data.problem, status: "approved" })
    .select("title slug difficulty")
    .lean();
  if (!problem) return fail(res, 404, "Problem not found");

  const existing = await findOpenSession(userId);
  if (existing) return alreadyInRoom(res, existing);

  try {
    const room = await createSessionDoc({
      problem: problem._id,
      problemInfo: {
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
      },
      visibility: parsed.data.visibility,
      hostUsername: req.user.username,
      participants: [
        { user: userId, username: req.user.username, role: "host" },
      ],
    });

    // a room nobody joins shouldn't stay listed forever
    scheduleExpiry(room.roomCode).catch(logTimerError);
    if (room.visibility === "public") emitToLobby();

    return res
      .status(201)
      .json({ success: true, session: serialize(room.toObject(), userId) });
  } catch (err) {
    // the check above passed but another request got in first
    if (isDuplicateOn(err, "participants.user")) {
      return alreadyInRoom(res, await findOpenSession(userId));
    }
    throw err;
  }
});

export const listPublicSessions = tryCatch(async (req, res) => {
  const parsed = listPublicQuerySchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error);

  const { problem, status, difficulty, search, page, limit } = parsed.data;

  const filter = { visibility: "public", open: true };
  if (status) filter.status = status;
  if (problem) filter["problemInfo.slug"] = problem;
  if (difficulty) filter["problemInfo.difficulty"] = difficulty;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ "problemInfo.title": pattern }, { hostUsername: pattern }];
  }

  const [rooms, total] = await Promise.all([
    sessionModel
      .find(filter)
      .select(
        "roomCode problemInfo hostUsername participants.user status createdAt",
      )
      // "waiting" sorts after "active", so descending puts joinable rooms first
      .sort({ status: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    sessionModel.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    rooms: rooms.map((r) => ({
      roomCode: r.roomCode,
      problem: r.problemInfo,
      hostUsername: r.hostUsername,
      participantCount: r.participants.length,
      status: r.status,
      createdAt: r.createdAt,
      isMine: isMember(r, req.user._id),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getMyOpenSession = tryCatch(async (req, res) => {
  const room = await findOpenSession(req.user._id);

  return res.status(200).json({
    success: true,
    session: room ? serialize(room, req.user._id) : null,
  });
});

export const getSession = tryCatch(async (req, res) => {
  if (!(await lookupAllowed(req.user._id))) {
    return fail(res, 429, "Too many attempts. Try again in a minute.");
  }

  const room = await findRoom(normalizeCode(req.params.code));
  if (!room) return fail(res, 404, "Room not found");

  return res
    .status(200)
    .json({ success: true, session: serialize(room, req.user._id) });
});

export const joinSession = tryCatch(async (req, res) => {
  const userId = req.user._id;

  if (!(await lookupAllowed(userId))) {
    return fail(res, 429, "Too many attempts. Try again in a minute.");
  }

  const code = normalizeCode(req.params.code);
  const room = await findRoom(code);
  if (!room) return fail(res, 404, "Room not found");

  // opening the link again from the same account just takes them back in
  if (isMember(room, userId)) {
    return res.status(200).json({
      success: true,
      rejoined: true,
      session: serialize(room, userId),
    });
  }

  if (!room.open) return fail(res, 410, "This room has ended");
  if (room.status !== "waiting" || room.participants.length >= 2) {
    return fail(res, 409, "This room is full");
  }

  const existing = await findOpenSession(userId);
  if (existing) return alreadyInRoom(res, existing);

  let joined;
  try {
    // one atomic update, the filter only matches while the room is still waiting with one person in it
    joined = await sessionModel
      .findOneAndUpdate(
        {
          roomCode: code,
          status: "waiting",
          open: true,
          "participants.1": { $exists: false },
        },
        {
          $push: {
            participants: {
              user: userId,
              username: req.user.username,
              role: "guest",
              joinedAt: new Date(),
              connected: false,
            },
          },
          $set: { status: "active", startedAt: new Date() },
        },
        { new: true },
      )
      .lean();
  } catch (err) {
    if (isDuplicateOn(err, "participants.user")) {
      return alreadyInRoom(res, await findOpenSession(userId));
    }
    throw err;
  }

  // someone else took the seat between the check and the update
  if (!joined) return fail(res, 409, "This room just filled up");

  // the guest has the grace period to open the room page, otherwise the host waits for nobody
  scheduleGrace(code, userId).catch(logTimerError);
  emitToChain(joined.chainId, "session:updated", {
    roomCode: code,
    status: joined.status,
  });
  if (joined.visibility === "public") emitToLobby();

  return res
    .status(200)
    .json({ success: true, session: serialize(joined, userId) });
});

// finds the room and makes sure the caller is in it, a stranger just sees "not found"
const loadAsMember = async (req, res) => {
  const room = await findRoom(normalizeCode(req.params.code));
  const me = room?.participants.find(
    (p) => String(p.user) === String(req.user._id),
  );

  if (!room || !me) {
    fail(res, 404, "Room not found");
    return null;
  }

  return { room, me };
};

export const cancelSession = tryCatch(async (req, res) => {
  const found = await loadAsMember(req, res);
  if (!found) return;

  const { room, me } = found;

  if (me.role !== "host")
    return fail(res, 403, "Only the host can cancel a room");
  if (room.status !== "waiting")
    return fail(res, 409, "Only a waiting room can be cancelled");

  const closed = await closeSession(room, {
    status: "abandoned",
    endReason: "cancelled",
    endedBy: req.user._id,
  });
  if (!closed) return fail(res, 409, "This room is no longer waiting");
  emitToChain(closed.chainId, "session:updated", {
    roomCode: closed.roomCode,
    status: closed.status,
    endReason: closed.endReason,
  });
  if (closed.visibility === "public") emitToLobby();

  return res.status(200).json({ success: true, message: "Room cancelled" });
});

export const endSession = tryCatch(async (req, res) => {
  const found = await loadAsMember(req, res);
  if (!found) return;

  const { room } = found;

  if (room.status !== "active")
    return fail(res, 409, "This session is not active");

  // either person can end it, it ends for both
  const closed = await closeSession(room, {
    status: "completed",
    endReason: "ended",
    endedBy: req.user._id,
  });
  if (!closed) return fail(res, 409, "This session has already ended");
  emitToChain(closed.chainId, "session:updated", {
    roomCode: closed.roomCode,
    status: closed.status,
    endReason: closed.endReason,
    endedBy: req.user.username,
  });
  if (closed.visibility === "public") emitToLobby();

  return res.status(200).json({
    success: true,
    session: serialize(closed.toObject(), req.user._id),
  });
});

export const startNextSession = tryCatch(async (req, res) => {
  const parsed = nextSessionSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error);

  const found = await loadAsMember(req, res);
  if (!found) return;

  const { room, me } = found;

  if (me.role !== "host")
    return fail(res, 403, "Only the host can pick the next problem");
  if (room.visibility !== "private") {
    return fail(
      res,
      400,
      "Only private rooms can continue with another problem",
    );
  }
  if (room.status !== "completed")
    return fail(res, 409, "End the current session first");
  if (room.nextRoomCode) {
    return fail(res, 409, "The next session has already started", {
      roomCode: room.nextRoomCode,
    });
  }

  const problem = await problemModel
    .findOne({ slug: parsed.data.problem, status: "approved" })
    .select("title slug difficulty")
    .lean();
  if (!problem) return fail(res, 404, "Problem not found");

  const now = new Date();

  try {
    // both people go straight into an active session, no link to share again
    const next = await createSessionDoc({
      chainId: room.chainId,
      previousSession: room._id,
      problem: problem._id,
      problemInfo: {
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
      },
      visibility: "private",
      hostUsername: room.hostUsername,
      status: "active",
      startedAt: now,
      participants: room.participants.map((p) => ({
        user: p.user,
        username: p.username,
        role: p.role,
        joinedAt: now,
        connected: p.connected,
      })),
    });

    await sessionModel.updateOne(
      { _id: room._id },
      { $set: { nextRoomCode: next.roomCode } },
    );
    // anyone who had already dropped gets the grace period to come back to the new room
    next.participants
      .filter((p) => !p.connected)
      .forEach((p) =>
        scheduleGrace(next.roomCode, p.user).catch(logTimerError),
      );

    emitToChain(next.chainId, "session:next", {
      roomCode: next.roomCode,
      problem: next.problemInfo,
    });

    return res.status(201).json({
      success: true,
      session: serialize(next.toObject(), req.user._id),
    });
  } catch (err) {
    if (isDuplicateOn(err, "participants.user")) {
      const started = await sessionModel
        .findOne({ previousSession: room._id })
        .select("roomCode")
        .lean();

      return started
        ? fail(res, 409, "The next session has already started", {
            roomCode: started.roomCode,
          })
        : fail(res, 409, "One of you is already in another open room");
    }
    throw err;
  }
});

export const getIceServers = tryCatch(async (req, res) => {
  // TURN bandwidth costs money, so only people in a live room get the list
  const room = await findOpenSession(req.user._id);
  if (!room) return fail(res, 403, "Join a room first");

  return res
    .status(200)
    .json({ success: true, iceServers: config.ICE_SERVERS });
});
