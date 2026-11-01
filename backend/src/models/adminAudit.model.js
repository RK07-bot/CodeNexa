import mongoose from "mongoose";

// One row per important admin action: who did what, to what, and when.
// Rows are only ever created, never edited, so there is no updatedAt.
const adminAuditSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // copied at write time so the log still reads well if the user is renamed or deleted
    actorUsername: { type: String, required: true },

    action: {
      type: String,
      required: true,
      enum: [
        "user.role_changed",
        "problem.created",
        "problem.ai_drafted",
        "problem.updated",
        "problem.published",
        "problem.unpublished",
        "problem.rejected",
        "problem.deleted",
        "session.force_ended",
      ],
    },

    targetType: {
      type: String,
      required: true,
      enum: ["user", "problem", "session"],
    },
    targetId: { type: String, required: true },
    // human readable name of the target (username, problem title, room code)
    targetLabel: { type: String, default: "" },

    // anything extra worth remembering, e.g. { from: "user", to: "admin" }
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminAuditSchema.index({ createdAt: -1 });
adminAuditSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const adminAuditModel = mongoose.model("AdminAudit", adminAuditSchema);

export default adminAuditModel;