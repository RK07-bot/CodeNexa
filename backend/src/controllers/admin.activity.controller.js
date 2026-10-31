import { z } from "zod";
import tryCatch from "../middlewares/try-catch.middleware.js";
import adminAuditModel from "../models/adminAudit.model.js";
import { listActivityQuerySchema } from "../validators/admin.validator.js";

// the audit log, newest first
export const listActivity = tryCatch(async (req, res) => {
  const parsed = listActivityQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid filters",
      errors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { targetType, page, limit } = parsed.data;

  const filter = targetType ? { targetType } : {};

  const [items, total] = await Promise.all([
    adminAuditModel
      .find(filter)
      // _id as a tiebreaker so pages don't repeat or skip rows
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("actorUsername action targetType targetId targetLabel details createdAt")
      .lean(),
    adminAuditModel.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    activity: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});