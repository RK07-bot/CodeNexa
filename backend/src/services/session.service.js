import mongoose from "mongoose";
import sessionModel from "../models/session.model.js";
import generateRoomCode from "../utils/generateRoomCode.js";

export const isDuplicateOn = (err, field) =>
  err?.code === 11000 && Boolean(err.keyPattern?.[field]);

export const findOpenSession = (userId) =>
  sessionModel.findOne({ "participants.user": userId, open: true }).lean();

export const createSessionDoc = async (fields) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const _id = new mongoose.Types.ObjectId();

    try {
      // a first session starts its own chain, later ones pass the chain in through fields
      return await sessionModel.create({
        _id,
        chainId: _id,
        roomCode: generateRoomCode(),
        ...fields,
      });
    } catch (err) {
      // a clash on the code just means trying another one
      if (!isDuplicateOn(err, "roomCode")) throw err;
    }
  }

  throw new Error("Could not generate a unique room code");
};

export const closeSession = (session, { status, endReason, endedBy = null }) => {
  const endedAt = new Date();
  const durationSeconds = session.startedAt
    ? Math.round((endedAt - session.startedAt) / 1000)
    : 0;

  // the open check means only one close can win if two arrive together
  return sessionModel.findOneAndUpdate(
    { _id: session._id, open: true },
    { $set: { status, endReason, endedBy, endedAt, durationSeconds, open: false } },
    { new: true },
  );
};