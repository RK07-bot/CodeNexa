import { z } from "zod";
import tryCatch from "../middlewares/try-catch.middleware.js";
import problemModel from "../models/problem.model.js";
import { listProblemsQuerySchema } from "../validators/problem.validator.js";

// the search text goes into a regex, so special characters have to be escaped first
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAcceptanceRate = ({ attempts, accepted }) =>
  attempts > 0 ? Math.round((accepted / attempts) * 100) : null;

export const listProblems = tryCatch(async (req, res) => {
  const parsed = listProblemsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid filters",
      errors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { search, difficulty, topic, page, limit } = parsed.data;

  const filter = { status: "approved" };
  if (difficulty) filter.difficulty = difficulty;
  if (topic) filter.topics = topic;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: pattern }, { topics: pattern }];
  }

  const [problems, total] = await Promise.all([
    problemModel
      .find(filter)
      .select("title slug difficulty topics stats")
      // _id as a tiebreaker so pages don't repeat or skip rows
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    problemModel.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    problems: problems.map(({ stats, ...rest }) => ({
      ...rest,
      acceptanceRate: getAcceptanceRate(stats),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getProblemBySlug = tryCatch(async (req, res) => {
  const problem = await problemModel
    .findOne({ slug: req.params.slug, status: "approved" })
    // whitelist on top of select:false in the model, so hidden tests and the
    // reference solution can't leak even if someone edits the schema later
    .select(
      "title slug description constraints inputFormat outputFormat difficulty topics hints timeLimit memoryLimit examples stats",
    )
    .lean();

  if (!problem) {
    return res.status(404).json({ success: false, message: "Problem not found" });
  }

  const { stats, ...rest } = problem;

  return res.status(200).json({
    success: true,
    problem: { ...rest, acceptanceRate: getAcceptanceRate(stats) },
  });
});

export const getTopics = tryCatch(async (req, res) => {
  // feeds the topic dropdown on the Problems page
  const topics = await problemModel.distinct("topics", { status: "approved" });

  return res.status(200).json({ success: true, topics: topics.sort() });
});