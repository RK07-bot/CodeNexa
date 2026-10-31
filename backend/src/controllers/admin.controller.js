import mongoose from "mongoose";
import { z } from "zod";
import tryCatch from "../middlewares/try-catch.middleware.js";
import userModel from "../models/user.model.js";
import submissionModel from "../models/submission.model.js";
import { listUsersQuerySchema } from "../validators/admin.validator.js";
import escapeRegex from "../utils/escapeRegex.js";
import invalidateUserCache from "../utils/invalidateUserCache.js";
import logAdminAction from "../utils/logAdminAction.js";

export const listUsers = tryCatch(async (req, res) => {
  const parsed = listUsersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid filters",
      errors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { search, role, page, limit } = parsed.data;

  const filter = {};
  if (role) filter.role = role;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ username: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    userModel
      .find(filter)
      // the password is never selected
      .select("username email role createdAt")
      // _id as a tiebreaker so pages don't repeat or skip rows
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    userModel.countDocuments(filter),
  ]);

  // submission counts only for the users on this page
  const activityRows = users.length
    ? await submissionModel.aggregate([
        { $match: { user: { $in: users.map((user) => user._id) } } },
        // one row per user + problem: how many tries, and was it ever accepted
        {
          $group: {
            _id: { user: "$user", problem: "$problem" },
            count: { $sum: 1 },
            accepted: {
              $max: { $cond: [{ $eq: ["$verdict", "accepted"] }, 1, 0] },
            },
          },
        },
        // same rule as the dashboard: only published problems count as solved
        {
          $lookup: {
            from: "problems",
            let: { problemId: "$_id.problem" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$problemId"] } } },
              { $project: { status: 1 } },
            ],
            as: "problem",
          },
        },
        {
          $group: {
            _id: "$_id.user",
            submissions: { $sum: "$count" },
            solved: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$accepted", 1] },
                      {
                        $eq: [
                          { $arrayElemAt: ["$problem.status", 0] },
                          "approved",
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
    : [];

  const activity = new Map(activityRows.map((row) => [String(row._id), row]));

  return res.status(200).json({
    success: true,
    users: users.map((user) => {
      const row = activity.get(String(user._id));

      return {
        ...user,
        solved: row?.solved ?? 0,
        submissions: row?.submissions ?? 0,
      };
    }),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const updateUserRole = tryCatch(async (req, res) => {
  // user ID from the URL, new role from the (already validated) body
  const { userId } = req.params;
  const { role } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user id",
    });
  }

  const target = await userModel.findById(userId).select("username email role");

  if (!target) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // nothing to change, so no write and no audit row
  if (target.role === role) {
    return res.status(200).json({
      success: true,
      message: `${target.username} is already ${role}`,
      user: target,
    });
  }

  // guards that only matter when removing admin rights
  if (role === "user") {
    // an admin cannot demote themselves (stops accidental lock-out)
    if (String(req.user._id) === String(target._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin role",
      });
    }

    // the platform must always keep at least one admin
    const adminCount = await userModel.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "At least one admin must remain",
      });
    }
  }

  // the filter includes the old role, so if someone else changed this user
  // a moment ago, nothing is overwritten and we report a conflict instead
  const previousRole = target.role;
  const user = await userModel
    .findOneAndUpdate(
      { _id: userId, role: previousRole },
      { role },
      { new: true },
    )
    .select("username email role");

  if (!user) {
    return res.status(409).json({
      success: false,
      message: "This user was changed by someone else. Refresh and try again",
    });
  }

  // drop the cached user so the new role applies immediately
  await invalidateUserCache(userId);

  await logAdminAction(req, {
    action: "user.role_changed",
    targetType: "user",
    targetId: user._id,
    targetLabel: user.username,
    details: { from: previousRole, to: role },
  });

  return res.status(200).json({
    success: true,
    message: `${user.username} is now ${role}`,
    user,
  });
});