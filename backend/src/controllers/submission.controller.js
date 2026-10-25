import { z } from "zod";
import tryCatch from "../middlewares/try-catch.middleware.js";
import problemModel from "../models/problem.model.js";
import submissionModel from "../models/submission.model.js";
import rateLimiter from "../utils/rateLimiter.js";
import { ExecutionError } from "../services/executor.service.js";
import { runWithInputs, judgeSubmission } from "../services/judge.service.js";
import {
  runCodeSchema,
  submitCodeSchema,
} from "../validators/problem.validator.js";
import sessionModel from "../models/session.model.js";

const OUTPUT_LIMIT = 10000;

const clip = (text = "") =>
  text.length > OUTPUT_LIMIT
    ? `${text.slice(0, OUTPUT_LIMIT)}\n...output cut off`
    : text;

const invalidRequest = (res, error) =>
  res.status(400).json({
    success: false,
    message: "Invalid request",
    errors: z.flattenError(error).fieldErrors,
  });

const tooFast = (res) =>
  res.status(429).json({
    success: false,
    message: "You are running code too quickly. Wait a moment and try again.",
  });

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Problem not found" });

// a Piston outage is not the user's fault, anything else goes to the normal error handler
const handleExecutionError = (err, res) => {
  if (err instanceof ExecutionError) {
    return res.status(503).json({
      success: false,
      message:
        "Code execution is unavailable right now. Please try again shortly.",
    });
  }
  throw err;
};

export const runCode = tryCatch(async (req, res) => {
  const parsed = runCodeSchema.safeParse(req.body);
  if (!parsed.success) return invalidRequest(res, parsed.error);

  const { allowed } = await rateLimiter({
    key: `run:${req.user._id}`,
    limit: 20,
    windowSeconds: 60,
  });
  if (!allowed) return tooFast(res);

  const problem = await problemModel
    .findOne({ slug: req.params.slug, status: "approved" })
    .select("examples timeLimit memoryLimit")
    .lean();
  if (!problem) return notFound(res);

  const { language, code } = parsed.data;
  const inputs = parsed.data.inputs ?? problem.examples.map((e) => e.input);

  try {
    const results = await runWithInputs(problem, { language, code, inputs });

    return res.status(200).json({
      success: true,
      results: results.map((r) => ({
        ...r,
        stdout: clip(r.stdout),
        stderr: clip(r.stderr),
      })),
    });
  } catch (err) {
    return handleExecutionError(err, res);
  }
});

export const submitCode = tryCatch(async (req, res) => {
  const parsed = submitCodeSchema.safeParse(req.body);
  if (!parsed.success) return invalidRequest(res, parsed.error);

  const { allowed } = await rateLimiter({
    key: `submit:${req.user._id}`,
    limit: 10,
    windowSeconds: 60,
  });
  if (!allowed) return tooFast(res);

  // the + is needed because the hidden tests are excluded from queries by default
  const problem = await problemModel
    .findOne({ slug: req.params.slug, status: "approved" })
    .select("examples timeLimit memoryLimit +testCases")
    .lean();
  if (!problem) return notFound(res);

  const { language, code } = parsed.data;
  let session = null;

  if (parsed.data.session) {
    // the room has to be live, for this problem, and the user has to be in it
    session = await sessionModel
      .findOne({
        roomCode: parsed.data.session,
        open: true,
        status: "active",
        problem: problem._id,
        "participants.user": req.user._id,
      })
      .select("_id")
      .lean();

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "That room is not active for this problem.",
      });
    }
  }

  let outcome;
  try {
    outcome = await judgeSubmission(problem, { language, code });
  } catch (err) {
    return handleExecutionError(err, res);
  }

  const submission = await submissionModel.create({
    user: req.user._id,
    problem: problem._id,
    language,
    code,
    verdict: outcome.verdict,
    passed: outcome.passed,
    total: outcome.total,
    session: session?._id ?? null,
  });

  await problemModel.updateOne(
    { _id: problem._id },
    {
      $inc: {
        "stats.attempts": 1,
        "stats.accepted": outcome.verdict === "accepted" ? 1 : 0,
      },
    },
  );

  if (session) {
    await sessionModel.updateOne(
      { _id: session._id },
      {
        $inc: { "stats.submissions": 1 },
        ...(outcome.verdict === "accepted" && {
          $set: { "stats.solved": true },
        }),
      },
    );
  }

  const { detail } = outcome;

  return res.status(200).json({
    success: true,
    submissionId: submission._id,
    ...outcome,
    detail: detail && {
      ...detail,
      ...(detail.stderr !== undefined && { stderr: clip(detail.stderr) }),
    },
  });
});

export const getMySubmissions = tryCatch(async (req, res) => {
  const problem = await problemModel
    .findOne({ slug: req.params.slug, status: "approved" })
    .select("_id")
    .lean();
  if (!problem) return notFound(res);

  // the code is left out, the list only needs verdicts and counts
  const submissions = await submissionModel
    .find({ user: req.user._id, problem: problem._id })
    .select("-code")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return res.status(200).json({ success: true, submissions });
});
