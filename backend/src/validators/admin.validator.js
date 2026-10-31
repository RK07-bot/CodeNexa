import { z } from "zod";
import { LANGUAGE_IDS } from "../config/languages.js";

export const updateUserRoleSchema = z.object({
  role: z.enum(["user", "admin"], "Invalid role"),
});

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(["user", "admin"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const listAdminProblemsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z
    .enum(["draft", "processing", "pending_review", "approved", "rejected"])
    .optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.string().trim().toLowerCase().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// admins only switch between published (approved) and draft here
export const updateProblemStatusSchema = z.object({
  status: z.enum(["approved", "draft"], "Invalid status"),
});

// ---- the problem form ----

// validation runs inside one request and allows 60 tests, so the form is capped below that
export const MAX_EXAMPLES = 5;
export const MAX_TESTS = 50;
const MAX_HINTS = 5;
const MAX_TOPICS = 8;

// browsers can send \r\n and people leave trailing blank lines, neither should change a test
const text = (max) =>
  z
    .string()
    .max(max, `Must be at most ${max} characters`)
    .transform((value) => value.replace(/\r\n/g, "\n").trimEnd());

const example = z
  .object({
    input: text(5000),
    output: text(5000),
    explanation: text(1000).default(""),
  })
  .refine((e) => e.input.length > 0 && e.output.length > 0, {
    message: "Every example needs an input and an output",
  });

const testCase = z
  .object({
    input: text(10000),
    expectedOutput: text(10000),
    source: z.enum(["author", "ai"]).default("author"),
  })
  .refine((t) => t.input.length > 0 && t.expectedOutput.length > 0, {
    message: "Every hidden test needs an input and an expected output",
  });

const referenceSolution = z.object({
  language: z.enum(LANGUAGE_IDS, "Pick a supported language"),
  code: text(20000).refine(
    (code) => code.length > 0,
    "Write the solution code",
  ),
  source: z.enum(["author", "ai"]).default("author"),
});

const topic = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(40, "A topic can be at most 40 characters");

// Used for creating and editing. Almost everything is optional because a draft can
// be saved half-filled, the model checks the required fields once a problem is
// submitted for review.
export const problemBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the problem a title")
    .max(100, "The title can be at most 100 characters"),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topics: z
    .array(topic)
    .max(MAX_TOPICS, `At most ${MAX_TOPICS} topics`)
    .default([])
    .transform((list) => [...new Set(list)]),
  description: text(10000).default(""),
  constraints: text(3000).default(""),
  inputFormat: text(3000).default(""),
  outputFormat: text(3000).default(""),
  hints: z
    .array(text(500))
    .max(MAX_HINTS, `At most ${MAX_HINTS} hints`)
    .default([])
    .transform((list) => list.filter((hint) => hint.length > 0)),
  timeLimit: z.coerce.number().int().min(1).max(10).default(2),
  memoryLimit: z.coerce.number().int().min(64).max(512).default(256),
  examples: z
    .array(example)
    .max(MAX_EXAMPLES, `At most ${MAX_EXAMPLES} examples`)
    .default([]),
  testCases: z
    .array(testCase)
    .max(MAX_TESTS, `At most ${MAX_TESTS} hidden tests`)
    .default([]),
  // null removes the solution
  referenceSolution: referenceSolution.nullable().default(null),
});

export const listActivityQuerySchema = z.object({
  targetType: z.enum(["user", "problem", "session"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});