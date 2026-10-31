import tryCatch from "../middlewares/try-catch.middleware.js";
import userModel from "../models/user.model.js";
import problemModel from "../models/problem.model.js";
import submissionModel from "../models/submission.model.js";
import sessionModel from "../models/session.model.js";
import { resolveTimezone, dayKey, addDays } from "../utils/dateHelpers.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// how many days the submissions chart, verdicts and languages cover
const WINDOW_DAYS = 14;
// a room that has been open longer than this is probably stuck
const STUCK_HOURS = 3;

export const getOverview = tryCatch(async (req, res) => {
  const timezone = resolveTimezone(req.query.tz);

  const now = new Date();
  const today = dayKey(now, timezone);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const stuckBefore = new Date(now.getTime() - STUCK_HOURS * HOUR_MS);

  // oldest first, the last key is today
  const keys = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    addDays(today, i - (WINDOW_DAYS - 1)),
  );

  // local midnight of the first day is never earlier than UTC midnight minus 14h
  // (the furthest-ahead timezone), so this is a safe lower bound that can use the index
  const since = new Date(new Date(`${keys[0]}T00:00:00Z`).getTime() - 14 * HOUR_MS);

  const stuckFilter = { open: true, createdAt: { $lt: stuckBefore } };

  const [
    totalUsers,
    newUsers,
    problemRows,
    pendingReview,
    submissionRows,
    liveRooms,
    completedThisWeek,
    stuckCount,
    stuckRooms,
  ] = await Promise.all([
    userModel.countDocuments({}),
    userModel.countDocuments({ createdAt: { $gte: weekAgo } }),

    problemModel.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ]),
    problemModel.countDocuments({ status: "pending_review" }),

    submissionModel.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $addFields: {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone },
          },
        },
      },
      // trims the safe lower bound down to exactly the days we show
      { $match: { day: { $in: keys } } },
      {
        $facet: {
          days: [
            {
              $group: {
                _id: "$day",
                total: { $sum: 1 },
                accepted: {
                  $sum: { $cond: [{ $eq: ["$verdict", "accepted"] }, 1, 0] },
                },
              },
            },
          ],
          verdicts: [
            { $group: { _id: "$verdict", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          languages: [
            { $group: { _id: "$language", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $limit: 6 },
          ],
        },
      },
    ]),

    // rooms that are waiting or active right now
    sessionModel.countDocuments({ open: true }),
    sessionModel.countDocuments({
      status: "completed",
      endedAt: { $gte: weekAgo },
    }),

    sessionModel.countDocuments(stuckFilter),
    sessionModel
      .find(stuckFilter)
      .sort({ createdAt: 1 })
      .limit(5)
      .select("roomCode status hostUsername problemInfo.title createdAt")
      .lean(),
  ]);

  const approved = { total: 0, easy: 0, medium: 0, hard: 0 };
  for (const row of problemRows) {
    if (row._id in approved) approved[row._id] = row.count;
    approved.total += row.count;
  }

  // $facet always returns one document, with empty lists when nothing matched
  const facet = submissionRows[0] || { days: [], verdicts: [], languages: [] };

  const byDay = new Map(facet.days.map((row) => [row._id, row]));
  const perDay = keys.map((date) => ({
    date,
    total: byDay.get(date)?.total ?? 0,
    accepted: byDay.get(date)?.accepted ?? 0,
  }));

  const todayRow = perDay[perDay.length - 1];

  return res.status(200).json({
    success: true,
    users: { total: totalUsers, newThisWeek: newUsers },
    problems: { approved, pendingReview },
    submissions: {
      today: todayRow.total,
      acceptedToday: todayRow.accepted,
      // null when nobody has submitted today
      acceptanceToday: todayRow.total
        ? Math.round((todayRow.accepted / todayRow.total) * 100)
        : null,
      perDay,
      verdicts: facet.verdicts.map((row) => ({
        verdict: row._id,
        count: row.count,
      })),
      languages: facet.languages.map((row) => ({
        language: row._id,
        count: row.count,
      })),
    },
    sessions: { live: liveRooms, completedThisWeek },
    attention: {
      pendingReview,
      stuckRooms: {
        hours: STUCK_HOURS,
        count: stuckCount,
        items: stuckRooms.map((room) => ({
          roomCode: room.roomCode,
          status: room.status,
          hostUsername: room.hostUsername,
          problemTitle: room.problemInfo?.title ?? "",
          createdAt: room.createdAt,
        })),
      },
    },
  });
});