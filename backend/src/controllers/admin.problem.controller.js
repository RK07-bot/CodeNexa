import mongoose from "mongoose";
import { z } from "zod";
import tryCatch from "../middlewares/try-catch.middleware.js";
import problemModel from "../models/problem.model.js";
import submissionModel from "../models/submission.model.js";
import sessionModel from "../models/session.model.js";
import { LANGUAGES } from "../config/languages.js";
import { ExecutionError } from "../services/executor.service.js";
import { runAllTests } from "../services/judge.service.js";
import { listAdminProblemsQuerySchema } from "../validators/admin.validator.js";
import { getProblemFingerprint } from "../utils/problemFingerprint.js";
import { slugify } from "../utils/slugify.js";
import escapeRegex from "../utils/escapeRegex.js";
import logAdminAction from "../utils/logAdminAction.js";

// validation runs inside the request, so very large test sets are refused
const MAX_VALIDATION_TESTS = 60;

const STATUSES = ["draft", "processing", "pending_review", "approved", "rejected"];

const sendInvalidId = (res) =>
  res.status(400).json({ success: false, message: "Invalid problem id" });

const sendNotFound = (res) =>
  res.status(404).json({ success: false, message: "Problem not found" });

export const listAdminProblems = tryCatch(async (req, res) => {
  const parsed = listAdminProblemsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid filters",
      errors: z.flattenError(parsed.error).fieldErrors,
    });
  }

  const { search, status, difficulty, topic, page, limit } = parsed.data;

  const filter = {};
  if (status) filter.status = status;
  if (difficulty) filter.difficulty = difficulty;
  if (topic) filter.topics = topic;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: pattern }, { slug: pattern }];
  }

  const [rows, total, statusRows] = await Promise.all([
    problemModel.aggregate([
      { $match: filter },
      // _id as a tiebreaker so pages don't repeat or skip rows
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          let: { userId: "$createdBy" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
            { $project: { username: 1 } },
          ],
          as: "creator",
        },
      },
      // hidden tests and the reference solution are only measured here, never returned
      {
        $project: {
          title: 1,
          slug: 1,
          difficulty: 1,
          status: 1,
          topics: 1,
          stats: 1,
          createdAt: 1,
          rejectionReason: 1,
          validatedAt: "$validation.validatedAt",
          testCount: { $size: { $ifNull: ["$testCases", []] } },
          hasSolution: {
            $gt: [
              { $strLenCP: { $ifNull: ["$referenceSolution.code", ""] } },
              0,
            ],
          },
          createdBy: { $arrayElemAt: ["$creator.username", 0] },
        },
      },
    ]),
    problemModel.countDocuments(filter),
    // for the counts on the status chips, not affected by the filters
    problemModel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of statusRows) statusCounts[row._id] = row.count;

  return res.status(200).json({
    success: true,
    problems: rows.map(({ stats, ...problem }) => ({
      ...problem,
      attempts: stats?.attempts ?? 0,
      acceptanceRate:
        stats?.attempts > 0
          ? Math.round((stats.accepted / stats.attempts) * 100)
          : null,
    })),
    statusCounts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// feeds the topic dropdown, every status counts (the public list only shows approved)
export const listAdminTopics = tryCatch(async (req, res) => {
  const topics = await problemModel.distinct("topics");

  return res.status(200).json({ success: true, topics: topics.sort() });
});

// the whole problem for the edit form, hidden tests and reference solution included
export const getAdminProblem = tryCatch(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return sendInvalidId(res);

  const problem = await problemModel
    .findById(id)
    .select("+testCases +referenceSolution")
    .populate("createdBy", "username")
    .lean();

  if (!problem) return sendNotFound(res);

  return res.status(200).json({
    success: true,
    problem: {
      ...problem,
      createdBy: problem.createdBy?.username ?? null,
      validatedAt: problem.validation?.validatedAt ?? null,
    },
  });
});

// fields the form controls, everything else on a problem is managed by the server
const formFields = (data) => ({
  title: data.title,
  difficulty: data.difficulty,
  topics: data.topics,
  description: data.description,
  constraints: data.constraints,
  inputFormat: data.inputFormat,
  outputFormat: data.outputFormat,
  hints: data.hints,
  timeLimit: data.timeLimit,
  memoryLimit: data.memoryLimit,
  examples: data.examples,
  testCases: data.testCases,
});

// names the empty required fields so the form can say what is missing
const sendMissingFields = (res, error) =>
  res.status(400).json({
    success: false,
    message: `Fill in the missing fields: ${Object.keys(error.errors).join(", ")}`,
  });

export const createProblem = tryCatch(async (req, res) => {
  const data = req.body;

  // new problems always start as drafts, publishing goes through validation
  const problem = await problemModel.create({
    ...formFields(data),
    ...(data.referenceSolution && { referenceSolution: data.referenceSolution }),
    status: "draft",
    createdBy: req.user._id,
  });

  await logAdminAction(req, {
    action: "problem.created",
    targetType: "problem",
    targetId: problem._id,
    targetLabel: problem.title,
  });

  return res.status(201).json({
    success: true,
    message: `"${problem.title}" was saved as a draft`,
    problem: { _id: problem._id },
  });
});

export const updateProblem = tryCatch(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  if (!mongoose.isValidObjectId(id)) return sendInvalidId(res);

  const problem = await problemModel
    .findById(id)
    .select("+testCases +referenceSolution");

  if (!problem) return sendNotFound(res);

  // a published problem keeps receiving submissions, changing its tests would make
  // earlier verdicts wrong, so it has to be unpublished first
  if (problem.status === "approved") {
    return res.status(409).json({
      success: false,
      message: "Unpublish this problem before editing it",
    });
  }

  if (problem.status === "processing") {
    return res.status(409).json({
      success: false,
      message: "This problem is still being processed. Try again in a moment",
    });
  }

  problem.set(formFields(data));
  problem.referenceSolution = data.referenceSolution ?? undefined;

  // an earlier validation only counts for the exact tests and solution it ran on
  const stored = problem.validation?.fingerprint;
  if (stored && stored !== getProblemFingerprint(problem)) {
    problem.set("validation", undefined);
  }

  try {
    await problem.save();
  } catch (error) {
    if (error.name === "ValidationError") return sendMissingFields(res, error);
    throw error;
  }

  await logAdminAction(req, {
    action: "problem.updated",
    targetType: "problem",
    targetId: problem._id,
    targetLabel: problem.title,
    details: { status: problem.status },
  });

  return res.status(200).json({
    success: true,
    message: `"${problem.title}" was saved`,
  });
});

export const validateProblem = tryCatch(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return sendInvalidId(res);

  const problem = await problemModel
    .findById(id)
    .select("+testCases +referenceSolution");

  if (!problem) return sendNotFound(res);

  const solution = problem.referenceSolution;

  if (!solution?.code) {
    return res.status(400).json({
      success: false,
      message: "This problem has no reference solution",
    });
  }

  if (!LANGUAGES[solution.language]) {
    return res.status(400).json({
      success: false,
      message: `The reference solution uses an unsupported language (${solution.language})`,
    });
  }

  const testCount = problem.examples.length + problem.testCases.length;

  if (testCount === 0) {
    return res.status(400).json({
      success: false,
      message: "This problem has no examples or hidden tests",
    });
  }

  if (testCount > MAX_VALIDATION_TESTS) {
    return res.status(400).json({
      success: false,
      message: `Too many tests to validate at once (${testCount}, the limit is ${MAX_VALIDATION_TESTS})`,
    });
  }

  let report;
  try {
    report = await runAllTests(problem, {
      language: solution.language,
      code: solution.code,
    });
  } catch (error) {
    // the runner being down says nothing about the problem, so nothing is recorded
    if (error instanceof ExecutionError) {
      return res.status(502).json({
        success: false,
        message: "The code runner is unavailable. Try again in a moment",
      });
    }
    throw error;
  }

  const valid = report.passed === report.total;
  const validatedAt = new Date();

  if (valid) {
    // the fingerprint ties this result to the exact tests, solution and limits that passed
    await problemModel.updateOne(
      { _id: problem._id },
      {
        $set: {
          validation: {
            validatedAt,
            validatedBy: req.user._id,
            fingerprint: getProblemFingerprint(problem),
            tests: report.total,
          },
        },
      },
    );
  } else {
    // a failing run removes any earlier "validated" mark
    await problemModel.updateOne(
      { _id: problem._id },
      { $unset: { validation: "" } },
    );
  }

  return res.status(200).json({
    success: true,
    valid,
    passed: report.passed,
    total: report.total,
    ran: report.ran,
    stopped: report.stopped,
    results: report.results,
    validatedAt: valid ? validatedAt : null,
  });
});

export const updateProblemStatus = tryCatch(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(id)) return sendInvalidId(res);

  // ---- publish ----
  if (status === "approved") {
    const problem = await problemModel
      .findById(id)
      .select("+testCases +referenceSolution");

    if (!problem) return sendNotFound(res);

    if (problem.status === "approved") {
      return res.status(200).json({
        success: true,
        message: `"${problem.title}" is already published`,
      });
    }

    if (!["draft", "pending_review", "rejected"].includes(problem.status)) {
      return res.status(409).json({
        success: false,
        message: `A problem that is ${problem.status.replace("_", " ")} cannot be published`,
      });
    }

    // publishing needs a validation that still matches the current tests and solution
    const validatedFor = problem.validation?.fingerprint;
    if (!validatedFor || validatedFor !== getProblemFingerprint(problem)) {
      return res.status(409).json({
        success: false,
        message:
          "Validate this problem first. It was never validated, or its tests or solution changed since the last validation",
      });
    }

    // problems made as drafts may not have a slug yet
    if (!problem.slug) {
      const slug = slugify(problem.title || "");

      if (!slug) {
        return res.status(400).json({
          success: false,
          message: "Give the problem a title before publishing",
        });
      }

      if (await problemModel.exists({ slug, _id: { $ne: problem._id } })) {
        return res.status(409).json({
          success: false,
          message: `Another problem already uses the slug "${slug}". Rename this problem first`,
        });
      }

      problem.slug = slug;
    }

    problem.status = "approved";
    problem.reviewedBy = req.user._id;
    problem.reviewedAt = new Date();
    problem.rejectionReason = undefined;

    // save() also checks that the fields required for a published problem are filled in
    await problem.save();

    await logAdminAction(req, {
      action: "problem.published",
      targetType: "problem",
      targetId: problem._id,
      targetLabel: problem.title,
      details: { slug: problem.slug },
    });

    return res.status(200).json({
      success: true,
      message: `"${problem.title}" is now published`,
    });
  }

  // ---- unpublish ----
  // the filter holds the old status, so a problem changed a moment ago is not overwritten
  const problem = await problemModel
    .findOneAndUpdate(
      { _id: id, status: "approved" },
      { status: "draft" },
      { new: true },
    )
    .select("title slug status");

  if (!problem) {
    const exists = await problemModel.exists({ _id: id });
    return exists
      ? res.status(409).json({
          success: false,
          message: "Only a published problem can be unpublished",
        })
      : sendNotFound(res);
  }

  await logAdminAction(req, {
    action: "problem.unpublished",
    targetType: "problem",
    targetId: problem._id,
    targetLabel: problem.title,
    details: { slug: problem.slug },
  });

  return res.status(200).json({
    success: true,
    message: `"${problem.title}" is now a draft`,
  });
});

export const deleteProblem = tryCatch(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return sendInvalidId(res);

  const problem = await problemModel.findById(id).select("title slug status");

  if (!problem) return sendNotFound(res);

  // a published problem can receive submissions at any moment, so it has to be
  // unpublished first, which also keeps the checks below from racing with new ones
  if (problem.status === "approved") {
    return res.status(409).json({
      success: false,
      message: "Unpublish this problem before deleting it",
    });
  }

  const [hasSubmissions, hasSessions] = await Promise.all([
    submissionModel.exists({ problem: problem._id }),
    sessionModel.exists({ problem: problem._id }),
  ]);

  if (hasSubmissions) {
    return res.status(409).json({
      success: false,
      message: "This problem has submissions, so it cannot be deleted",
    });
  }

  if (hasSessions) {
    return res.status(409).json({
      success: false,
      message: "This problem was used in rooms, so it cannot be deleted",
    });
  }

  await problemModel.deleteOne({ _id: problem._id });

  await logAdminAction(req, {
    action: "problem.deleted",
    targetType: "problem",
    targetId: problem._id,
    targetLabel: problem.title,
    details: { slug: problem.slug, status: problem.status },
  });

  return res.status(200).json({
    success: true,
    message: `"${problem.title}" was deleted`,
  });
});