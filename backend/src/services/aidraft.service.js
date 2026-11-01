import problemModel from "../models/problem.model.js";
import { PipelineError, runAiDraft } from "./problemPipeline.service.js";
import { getProblemFingerprint } from "../utils/problemFingerprint.js";

// a draft that is still "processing" after this long lost its job (for example a
// Redis restart), so it is given up on and can be tried again
export const STALE_MINUTES = 30;

// how many existing titles the AI is shown to avoid duplicates
const TITLES_SHOWN = 300;

// the statement fields as they sit on a problem
const statementFields = (s) => ({
  title: s.title,
  difficulty: s.difficulty,
  topics: s.topics,
  description: s.description,
  constraints: s.constraints,
  inputFormat: s.inputFormat,
  outputFormat: s.outputFormat,
  hints: s.hints,
  examples: s.examples,
  ...(s.timeLimit !== undefined && { timeLimit: s.timeLimit }),
});

// the draft goes back to being an editable draft, with the reason on it
export const failDraft = (problemId, message, model = problemModel) =>
  model.updateOne(
    { _id: problemId, status: "processing" },
    {
      $set: { status: "draft", "ai.error": message, "ai.finishedAt": new Date() },
      $unset: { "ai.stage": "" },
    },
  );

// Drafts one problem with the AI and saves the result. The model and the pipeline
// can be swapped, which is how the tests run it without a database.
export const draftWithAi = async (
  { problemId },
  { model = problemModel, run = runAiDraft } = {},
) => {
  const problem = await model
    .findOne({ _id: problemId, status: "processing" })
    .select("ai createdBy")
    .lean();

  // deleted, or already dealt with
  if (!problem) return;

  try {
    const [titleRows, existingTopics] = await Promise.all([
      model
        .find({ _id: { $ne: problemId }, title: { $exists: true, $ne: "" } })
        .sort({ createdAt: -1 })
        .limit(TITLES_SHOWN)
        .select("title")
        .lean(),
      model.distinct("topics"),
    ]);

    const result = await run(
      {
        idea: problem.ai.idea,
        difficulty: problem.ai.request?.difficulty,
        existingTitles: titleRows.map((row) => row.title),
        existingTopics: existingTopics.sort(),
      },
      {
        // what exists so far is saved at every step, so a failure keeps the statement
        // and the solution for the admin to continue by hand
        onProgress: async (stage, partial) => {
          const set = { "ai.stage": stage };
          if (partial.statement) Object.assign(set, statementFields(partial.statement));
          if (partial.solution) set.referenceSolution = partial.solution;

          await model.updateOne({ _id: problemId, status: "processing" }, { $set: set });
        },
      },
    );

    // loaded as a document so save() checks that everything a reviewed problem needs is there
    const doc = await model
      .findOne({ _id: problemId, status: "processing" })
      .select("+testCases +referenceSolution");

    if (!doc) return;

    doc.set({
      ...statementFields(result.statement),
      timeLimit: result.timeLimit,
      testCases: result.testCases,
      referenceSolution: result.solution,
    });

    doc.status = "pending_review";
    doc.rejectionReason = undefined;
    doc.ai.stage = undefined;
    doc.ai.error = undefined;
    doc.ai.finishedAt = new Date();
    doc.ai.report = result.report;

    // every test was produced by running the solution, so when nothing was flagged as
    // an error the problem counts as validated and can be published after the review
    doc.set("validation", undefined);

    if (result.validated) {
      doc.validation = {
        validatedAt: new Date(),
        validatedBy: problem.createdBy,
        fingerprint: getProblemFingerprint(doc),
        tests: doc.examples.length + doc.testCases.length,
      };
    }

    await doc.save();
  } catch (error) {
    // a PipelineError is written for the admin, anything else is a bug: it is logged
    // and the admin only sees a general message
    if (error instanceof PipelineError) {
      await failDraft(problemId, error.message, model);
      return;
    }

    console.error("AI drafting failed:", error);
    await failDraft(problemId, "Something went wrong while drafting. Try again.", model);
  }
};

// gives up on drafts whose job was lost
export const sweepStale = (model = problemModel) =>
  model.updateMany(
    {
      status: "processing",
      "ai.startedAt": { $lt: new Date(Date.now() - STALE_MINUTES * 60 * 1000) },
    },
    {
      $set: {
        status: "draft",
        "ai.error": "Drafting took too long and was stopped. Try again.",
        "ai.finishedAt": new Date(),
      },
      $unset: { "ai.stage": "" },
    },
  );