import adminAuditModel from "../models/adminAudit.model.js";

// Writes one audit row for the admin making the request (req.user).
// A failed audit write is logged but never breaks the action itself.
const logAdminAction = async (
  req,
  { action, targetType, targetId, targetLabel = "", details = {} },
) => {
  try {
    await adminAuditModel.create({
      actor: req.user._id,
      actorUsername: req.user.username,
      action,
      targetType,
      targetId: String(targetId),
      targetLabel,
      details,
    });
  } catch (error) {
    console.error("Failed to write admin audit log:", error);
  }
};

export default logAdminAction;