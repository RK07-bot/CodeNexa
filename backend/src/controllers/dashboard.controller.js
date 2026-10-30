import mongoose from "mongoose";
import tryCatch from "../middlewares/try-catch.middleware.js";
import submissionModel from "../models/submission.model.js";
import problemModel from "../models/problem.model.js";
import sessionModel from "../models/session.model.js";

// the browser sends its own timezone, so "today" and "this month" match the user's calendar
const resolveTimezone = (tz) => {
  if (typeof tz !== "string" || !tz) return "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
};

// "2026-10-30" in the given timezone
const dayKey = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const addDays = (key, amount) => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

// days must be sorted newest first, one entry per day
const getStreaks = (days, today) => {
  if (!days.length) return { current: 0, best: 0 };

  const yesterday = addDays(today, -1);

  let current = 0;
  if (days[0] === today || days[0] === yesterday) {
    let expected = days[0];

    for (const day of days) {
      if (day !== expected) break;
      current++;
      expected = addDays(expected, -1);
    }
  }

  let best = 1;
  let run = 1;

  for (let i = 1; i < days.length; i++) {
    run = days[i] === addDays(days[i - 1], -1) ? run + 1 : 1;
    if (run > best) best = run;
  }

  return { current, best };
};

export const getDashboard = tryCatch(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(String(req.user._id));
  const timezone = resolveTimezone(req.query.tz);

  const now = new Date();
  const today = dayKey(now, timezone);
  const thisMonth = today.slice(0, 7);

  const [problemRows, sessionRows, languageRows, activityRows, recentRows, totalRows] = await Promise.all([
    // one row per problem the user has tried: when they first tried it and first solved it
    submissionModel.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$problem",
          firstAt: { $min: "$createdAt" },
          firstSolvedAt: {
            $min: { $cond: [{ $eq: ["$verdict", "accepted"] }, "$createdAt", null] },
          },
        },
      },
      { $lookup: { from: "problems", localField: "_id", foreignField: "_id", as: "problem" } },
      { $unwind: "$problem" },
      {
        $project: {
          firstAt: 1,
          firstSolvedAt: 1,
          difficulty: "$problem.difficulty",
          topics: "$problem.topics",
          status: "$problem.status",
        },
      },
    ]),

    // completed rooms this user was part of
    sessionModel.aggregate([
      { $match: { status: "completed", "participants.user": userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          thisMonth: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $dateToString: {
                        format: "%Y-%m",
                        date: "$endedAt",
                        timezone,
                        onNull: null,
                      },
                    },
                    thisMonth,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    submissionModel.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$language", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 20 },
      { $project: { _id: 0, language: "$_id", count: 1 } },
    ]),

    // every day the user submitted code, in their own timezone
    submissionModel.aggregate([
      { $match: { user: userId } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone } } } },
      { $sort: { _id: -1 } },
    ]),

    submissionModel.aggregate([
      { $match: { user: userId } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: 10 },
      { $lookup: { from: "problems", localField: "problem", foreignField: "_id", as: "problem" } },
      { $unwind: "$problem" },
      {
        $project: {
          _id: 1,
          language: 1,
          verdict: 1,
          createdAt: 1,
          mode: { $cond: [{ $ifNull: ["$session", false] }, "Interview", "Solo"] },
          problem: {
            title: "$problem.title",
            slug: "$problem.slug",
            difficulty: "$problem.difficulty",
            topic: { $ifNull: [{ $arrayElemAt: ["$problem.topics", 0] }, "-"] },
          },
        },
      },
    ]),

    // how many problems exist per difficulty, the "out of" part of the solved ring
    problemModel.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ]),
  ]);

  // problem based numbers, only problems that are still published count
  const solvedBy = { easy: 0, medium: 0, hard: 0 };
  const topicCounts = new Map();
  let solved = 0;
  let attempted = 0;

  for (const row of problemRows) {
    if (row.status !== "approved") continue;

    attempted++;

    if (row.firstSolvedAt) {
      solved++;
      if (solvedBy[row.difficulty] !== undefined) solvedBy[row.difficulty]++;
    }

    // a topic counts once per problem, so retrying one problem does not inflate it
    for (const topic of row.topics ?? []) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const totals = { easy: 0, medium: 0, hard: 0 };
  for (const row of totalRows) {
    if (totals[row._id] !== undefined) totals[row._id] = row.count;
  }

  const topics = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, 20);

  const streaks = getStreaks(
    activityRows.map((row) => row._id),
    today,
  );

  const sessions = sessionRows[0] ?? { total: 0, thisMonth: 0 };

  return res.status(200).json({
    success: true,
    dashboard: {
      stats: {
        solved: { total: solved, ...solvedBy },
        totals: { total: totals.easy + totals.medium + totals.hard, ...totals },
        // tried at least once but not solved yet
        attempting: attempted - solved,
        sessions: sessions.total,
        sessionsThisMonth: sessions.thisMonth,
        streak: streaks.current,
        bestStreak: streaks.best,
      },
      languages: languageRows,
      topics,
      recentPractice: recentRows,
    },
  });
});