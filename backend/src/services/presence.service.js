import sessionModel from "../models/session.model.js";
import { cancelGrace, scheduleGrace } from "../jobs/queues/session.queue.js";

export const markConnected = async (roomCode, userId) => {
  const session = await sessionModel
    .findOneAndUpdate(
      { roomCode, "participants.user": userId },
      {
        $set: { "participants.$.connected": true },
        $unset: { "participants.$.disconnectedAt": "" },
      },
      { new: true },
    )
    .lean();

  await cancelGrace(roomCode, userId);
  return session;
};

export const markDisconnected = async (roomCode, userId) => {
  const session = await sessionModel
    .findOneAndUpdate(
      { roomCode, "participants.user": userId },
      {
        $set: {
          "participants.$.connected": false,
          "participants.$.disconnectedAt": new Date(),
        },
      },
      { new: true },
    )
    .lean();

  // only a live room is worth waiting for someone to come back to
  if (session?.open) await scheduleGrace(roomCode, userId);
  return session;
};

// after a restart nobody is really connected, so anyone still marked that way gets the grace period
export const reconcilePresence = async () => {
  const stale = await sessionModel
    .find({ open: true, "participants.connected": true })
    .select("roomCode participants")
    .lean();

  for (const session of stale) {
    for (const person of session.participants.filter((p) => p.connected)) {
      await markDisconnected(session.roomCode, person.user);
    }
  }

  return stale.length;
};