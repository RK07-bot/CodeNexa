import mongoose from "mongoose";

// a draft can be saved half-filled, and a problem the AI is still writing is empty
// at first, so these only become required once it is submitted
const requiredUnlessDraft = [
  function () {
    return !["draft", "processing"].includes(this.status);
  },
  "{PATH} is required",
];

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

// hidden tests, only the judge uses these
const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    source: { type: String, enum: ["author", "ai"], default: "ai" },
  },
  { _id: false },
);

const referenceSolutionSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    code: { type: String, required: true },
    source: { type: String, enum: ["author", "ai"], default: "ai" },
  },
  { _id: false },
);

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      required: requiredUnlessDraft,
    },
    // set when the problem is submitted, not on draft
    slug: { type: String, unique: true, sparse: true },
    description: { type: String, required: requiredUnlessDraft },
    constraints: { type: String, default: "" },
    inputFormat: { type: String, required: requiredUnlessDraft },
    outputFormat: { type: String, required: requiredUnlessDraft },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: requiredUnlessDraft,
    },
    topics: [{ type: String, trim: true, lowercase: true }],
    hints: { type: [String], default: [] },

    timeLimit: { type: Number, default: 2, min: 1, max: 10 }, // seconds
    memoryLimit: { type: Number, default: 256, min: 64, max: 512 }, // MB

    examples: { type: [exampleSchema], default: [] },
    testCases: { type: [testCaseSchema], default: [], select: false },
    referenceSolution: { type: referenceSolutionSchema, select: false },

    status: {
      type: String,
      enum: ["draft", "processing", "pending_review", "approved", "rejected"],
      default: "draft",
    },
    rejectionReason: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },

    // set by the admin "Validate" button, publishing needs it to match the current tests
    validation: {
      validatedAt: { type: Date },
      validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fingerprint: { type: String },
      tests: { type: Number },
    },

    // only set on problems drafted by the AI
    ai: {
      idea: { type: String },
      // what the admin asked for besides the idea
      request: {
        difficulty: { type: String, enum: ["easy", "medium", "hard"] },
      },
      // while processing: queued, drafting, solving, testing or checking
      stage: { type: String },
      // why the last attempt failed, the admin sees this on the draft
      error: { type: String },
      startedAt: { type: Date },
      finishedAt: { type: Date },
      // flags and numbers from the automatic checks, shown on the review screen
      report: { type: mongoose.Schema.Types.Mixed },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    stats: {
      attempts: { type: Number, default: 0 },
      accepted: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

problemSchema.index({ status: 1, difficulty: 1 });
problemSchema.index({ topics: 1 });
problemSchema.index({ createdBy: 1, createdAt: -1 });

const problemModel = mongoose.model("Problem", problemSchema);

export default problemModel;