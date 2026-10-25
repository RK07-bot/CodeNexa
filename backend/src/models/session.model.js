import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // copied here so room screens never need a user lookup
    username: { type: String, required: true },
    role: { type: String, enum: ["host", "guest"], required: true },
    joinedAt: { type: Date, default: Date.now },
    // presence is written by the socket layer, the REST endpoints never touch these two
    connected: { type: Boolean, default: false },
    disconnectedAt: { type: Date },
  },
  { _id: false },
);

const sessionSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, unique: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    // copied from the problem so the room lists can filter and search in one query
    problemInfo: {
      title: { type: String, required: true },
      slug: { type: String, required: true },
      difficulty: { type: String, required: true },
    },
    visibility: { type: String, enum: ["private", "public"], required: true },
    hostUsername: { type: String, required: true },
    participants: { type: [participantSchema], default: [] },

    status: {
      type: String,
      enum: ["waiting", "active", "completed", "abandoned"],
      default: "waiting",
    },
    // true while the room is waiting or active, the unique index below depends on it
    open: { type: Boolean, default: true },
    endReason: { type: String, enum: ["ended", "cancelled", "expired", "disconnected"] },
    endedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    startedAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },

    // every problem in one sitting shares a chain, it is what keeps the call alive between problems
    chainId: { type: mongoose.Schema.Types.ObjectId, required: true },
    previousSession: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    nextRoomCode: { type: String },

    stats: {
      submissions: { type: Number, default: 0 },
      solved: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

// a user can be in only one open room, enforced here so two quick clicks can't create two
sessionSchema.index(
  { "participants.user": 1 },
  { unique: true, partialFilterExpression: { open: true } },
);
sessionSchema.index({ visibility: 1, open: 1, createdAt: -1 });
sessionSchema.index({ chainId: 1 });

const sessionModel = mongoose.model("Session", sessionSchema);

export default sessionModel;