import { z } from "zod";
import config from "../config/env.js";
import { AiError, generateJson, schema as S } from "./gemini.service.js";
import { ExecutionError, executeMany } from "./executor.service.js";
import { normalize } from "./judge.service.js";

// A failure the admin can read and act on. The message is shown on the draft.
export class PipelineError extends Error {}

const LANGUAGE = "python";
const MEMORY_LIMIT = 256;
const BRUTE_FORCE_TIME_LIMIT = 10; // seconds, it is allowed to be slow
const GENERATOR_TIME_LIMIT = 10;
const LARGE_TEST_SEEDS = [1, 2, 3];
const MAX_LARGE_INPUT_CHARS = 20000;
const MIN_HIDDEN_TESTS = 8;
const MAX_SMALL_TESTS = 9;
// above this share of disagreements the two solutions cannot both be trusted
const MAX_DISAGREE_RATIO = 0.25;

// ---------- prompts ----------

const RULES = `You write programming problems for CodeNexa, a coding practice website.

How problems work here:
- A solution is a complete program that reads standard input and writes standard output. There are no function signatures, classes or starter code.
- Solutions are judged by comparing the printed output with the expected output after removing trailing spaces and blank lines at the end. The comparison is exact, so every valid input must have exactly ONE correct output.
- If a task could have several valid answers, change the task so that one answer is required (for example "print the smallest such index" or "print the lexicographically smallest answer").
- Avoid floating point answers. If one is unavoidable, state the exact number of decimals to print.
- Everything is plain text. No Markdown, no LaTeX, no HTML. Write powers as 10^5 and use <= and >= for comparisons.
- Make the problem original and self-contained. Do not copy the text of a well-known problem from another website.`;

const statementPrompt = ({ idea, difficulty, existingTitles, existingTopics }) => `Idea from the admin:
"""
${idea}
"""
${difficulty ? `Requested difficulty: ${difficulty}.` : "Choose the difficulty yourself."}

Existing problems on the site (do NOT duplicate any of them):
${existingTitles.length ? existingTitles.map((t) => `- ${t}`).join("\n") : "(none yet)"}

Topics already used on the site. Reuse them when they fit and add a new one only when none does:
${existingTopics.length ? existingTopics.join(", ") : "(none yet)"}

Write the full problem:
- title: short and specific, and not already used above.
- description: the task in clear plain text, 2 to 4 short paragraphs. Define every term. Do not put examples or constraints here.
- constraints: one per line, for example "1 <= n <= 10^5".
- inputFormat and outputFormat: say exactly what each line of the input and the output contains, in order.
- examples:exactly 2. Each has the exact stdin text as "input" (lines separated by newlines), the exact expected "output", and a one or two sentence explanation. Keep them small and work them out carefully, a wrong example is the most common mistake.
- hints: 2 or 3, from a gentle nudge to an almost complete idea. Never include code.
- topics: 1 to 4 lowercase topics.
- timeLimit: seconds a good solution needs, 1 to 5. Use 2 unless the problem is heavy.`;

const describeProblem = (s) => `TITLE: ${s.title}

DESCRIPTION:
${s.description}

CONSTRAINTS:
${s.constraints}

INPUT FORMAT:
${s.inputFormat}

OUTPUT FORMAT:
${s.outputFormat}

EXAMPLES:
${s.examples.map((e, i) => `Example ${i + 1}\nInput:\n${e.input}\nOutput:\n${e.output}`).join("\n\n")}`;

const solutionsPrompt = (s) => `${describeProblem(s)}

Write two independent Python 3 programs for this problem. Each must read all of standard input and print only the answer.
- reference: the intended efficient solution. It must meet the constraints and finish within ${s.timeLimit} seconds on the largest allowed inputs.
- bruteForce: the simplest, obviously correct solution, even if it is far too slow for large inputs (it only runs on small inputs). It must use a clearly different method from reference, otherwise it cannot catch mistakes.
Use only the standard library. Do not wrap the code in Markdown fences.`;

const testsPrompt = (s) => `${describeProblem(s)}

Create test data.
1. smallTests: between 8 and 9 inputs. Each must be small enough for a brute-force solution to finish in well under a second. Cover the smallest allowed input, boundary values from the constraints, duplicates, negative values if they are allowed, sorted and reverse sorted data, all values equal, cases where nothing is found if the problem allows that, and a few ordinary varied cases. Every input must follow the input format and the constraints exactly, with lines separated by newlines and no trailing spaces. "purpose" is a few words.
2. generator: a Python 3 program that reads one integer seed from standard input, calls random.seed(seed) and prints ONE valid large test input, never more than 15000 characters in total (use values near the upper limits, but keep the number of values moderate, around 2000 at most). Seed 1: random data of the largest size. Seed 2: the worst case for a slow solution. Seed 3: a degenerate pattern such as all equal, sorted or reverse sorted. It must always print valid input. Use only the standard library and do not wrap the code in Markdown fences.`;

// ---------- reading what the AI sent back ----------

const text = (max) =>
  z
    .string()
    .max(max)
    .transform((v) => v.replace(/\r\n/g, "\n").trimEnd());

const stripFence = (code) =>
  code
    .replace(/^\s*```[a-zA-Z0-9]*\s*\n/, "")
    .replace(/\n\s*```\s*$/, "")
    .trimEnd();

const code = z
  .string()
  .max(20000)
  .transform((v) => stripFence(v.replace(/\r\n/g, "\n")))
  .refine((v) => v.trim().length > 0, "the code is empty");

const statementSchema = z.object({
  title: z.string().trim().min(1).max(100),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topics: z
    .array(z.string().trim().toLowerCase().min(1).max(40))
    .min(1)
    .transform((list) => [...new Set(list)].slice(0, 4)),
  description: text(10000).refine((v) => v.length >= 40, "the description is too short"),
  constraints: text(3000),
  inputFormat: text(3000).refine((v) => v.length > 0, "the input format is empty"),
  outputFormat: text(3000).refine((v) => v.length > 0, "the output format is empty"),
  examples: z
    .array(
      z.object({
        input: text(5000).refine((v) => v.length > 0, "an example has no input"),
        output: text(5000).refine((v) => v.length > 0, "an example has no output"),
        explanation: text(1000).default(""),
      }),
    )
    .min(1)
    .max(3),
  hints: z
    .array(text(500))
    .transform((list) => list.filter((h) => h.length > 0).slice(0, 5)),
  timeLimit: z.coerce
    .number()
    .transform((n) => Math.min(5, Math.max(1, Math.round(n) || 2))),
});

const solutionsSchema = z.object({ reference: code, bruteForce: code });

const testsSchema = z.object({
  smallTests: z
    .array(z.object({ input: text(5000) }))
    .transform((list) => list.map((t) => t.input).filter((i) => i.length > 0))
    .refine((list) => list.length >= 6, "too few small tests"),
  generator: z.string().max(20000).transform(stripFence),
});

const issuesOf = (error) =>
  error.issues.map((i) => `${i.path.join(".") || "answer"}: ${i.message}`).join("; ");

// Asks for one stage. If the answer does not pass the checks, the AI is told what
// was wrong and gets a single second try.
const ask = async (stage, deps, { system, prompt, responseSchema, parser, temperature }) => {
  let feedback = "";
  let issues = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { json, tokens } = await deps.generate({
      system,
      prompt: prompt + feedback,
      responseSchema,
      temperature,
    });
    deps.usage.tokens += tokens;

    const parsed = parser.safeParse(json);
    if (parsed.success) return parsed.data;

    issues = issuesOf(parsed.error);
    feedback = `\n\nYour previous answer was rejected: ${issues}. Answer again and fix this.`;
  }

  throw new PipelineError(`The AI's ${stage} could not be used (${issues}).`);
};

// ---------- the three AI steps ----------

const draftStatement = (input, deps) =>
  ask("problem statement", deps, {
    system: RULES,
    prompt: statementPrompt(input),
    temperature: 0.7,
    parser: statementSchema,
    responseSchema: S.object({
      title: S.string("A short, specific problem title"),
      difficulty: S.oneOf(["easy", "medium", "hard"]),
      topics: S.array(S.string(), "1 to 4 lowercase topics"),
      description: S.string("Plain text task description"),
      constraints: S.string("One constraint per line"),
      inputFormat: S.string(),
      outputFormat: S.string(),
      examples: S.array(
        S.object({ input: S.string(), output: S.string(), explanation: S.string() }),
      ),
      hints: S.array(S.string()),
      timeLimit: S.integer("Seconds, 1 to 5"),
    }),
  });

const writeSolutions = (statement, deps) =>
  ask("solutions", deps, {
    system: RULES,
    prompt: solutionsPrompt(statement),
    temperature: 0.2,
    parser: solutionsSchema,
    responseSchema: S.object({
      reference: S.string("Python 3 code of the efficient solution"),
      bruteForce: S.string("Python 3 code of the simple brute-force solution"),
    }),
  });

const writeTests = (statement, deps) =>
  ask("tests", deps, {
    system: RULES,
    prompt: testsPrompt(statement),
    temperature: 0.5,
    parser: testsSchema,
    responseSchema: S.object({
      smallTests: S.array(S.object({ input: S.string(), purpose: S.string() })),
      generator: S.string("Python 3 code of the test generator"),
    }),
  });

// ---------- running code ----------

const runPython = async (deps, source, inputs, timeLimit) => {
  if (inputs.length === 0) return [];

  return deps.execute(
    inputs.map((input) => ({
      language: LANGUAGE,
      code: source,
      stdin: `${input}\n`,
      timeLimit,
      memoryLimit: MEMORY_LIMIT,
    })),
  );
};

// ---------- small helpers ----------

const words = (title) =>
  new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );

// 0 to 1, how much of the two titles is the same
const titleSimilarity = (a, b) => {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return 0;

  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / (x.size + y.size - shared);
};

const unique = (inputs) => {
  const seen = new Set();
  return inputs.filter((input) => {
    const key = normalize(input);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ---------- the pipeline ----------

// Drafts a whole problem from an idea. It never touches the database, it only
// reports progress through onProgress(stage, partialResult) so the caller can save
// what exists so far. Resolves to everything the problem needs, or throws a
// PipelineError whose message says what went wrong.
export const runAiDraft = async (
  { idea, difficulty, existingTitles = [], existingTopics = [] },
  { onProgress = async () => {}, deps: overrides = {} } = {},
) => {
  const started = Date.now();
  const deps = {
    generate: generateJson,
    execute: executeMany,
    usage: { tokens: 0 },
    ...overrides,
  };
  const flags = [];
  const flag = (level, message) => flags.push({ level, message });

  try {
    // 1. the statement
    await onProgress("drafting", {});
    const statement = await draftStatement(
      { idea, difficulty, existingTitles, existingTopics },
      deps,
    );

    const closest = existingTitles
      .map((title) => ({ title, score: titleSimilarity(statement.title, title) }))
      .sort((a, b) => b.score - a.score)[0];

    if (closest && closest.score >= 0.6) {
      flag("warn", `The title is very close to the existing problem "${closest.title}". Check that this is not a duplicate.`);
    }

    // 2. two independent solutions
    await onProgress("solving", { statement });
    const solutions = await writeSolutions(statement, deps);

    if (normalize(solutions.reference) === normalize(solutions.bruteForce)) {
      flag("warn", "The brute-force solution is identical to the reference solution, so the cross-check is weaker than usual.");
    }

    const solution = { language: LANGUAGE, code: solutions.reference, source: "ai" };

    // 3. test inputs
    await onProgress("testing", { statement, solution });
    const tests = await writeTests(statement, deps);

    // 4. run everything and compare
    await onProgress("checking", { statement, solution });

    const exampleKeys = new Set(statement.examples.map((e) => normalize(e.input)));
    const smallInputs = unique(tests.smallTests)
      .filter((input) => !exampleKeys.has(normalize(input)))
      .slice(0, MAX_SMALL_TESTS);

    // examples first, they are checked the same way as the small tests
    const baseInputs = [...statement.examples.map((e) => e.input), ...smallInputs];

    const refRuns = await runPython(deps, solution.code, baseInputs, statement.timeLimit);
    const refOk = refRuns.filter((r) => r.status === "ok").length;

    if (refOk < baseInputs.length / 2) {
      const first = refRuns.find((r) => r.status !== "ok");
      const why = first?.stderr ? ` (${first.stderr.trim().split("\n").pop().slice(0, 160)})` : "";
      throw new PipelineError(
        `The AI's reference solution failed on ${baseInputs.length - refOk} of ${baseInputs.length} inputs${why}.`,
      );
    }

    // The brute-force solution only runs where the reference solution produced
    // a valid, non-empty output.
    const checkable = baseInputs.filter((_, i) => {
      const run = refRuns[i];
      return run.status === "ok" && normalize(run.stdout).length > 0;
    });

    const bruteRuns = await runPython(
      deps,
      solutions.bruteForce,
      checkable,
      BRUTE_FORCE_TIME_LIMIT,
    );

    const bruteByInput = new Map(
      checkable.map((input, i) => [input, bruteRuns[i]]),
    );

    // Per input: failed, no_output, disagree, agreed or unchecked.
    const verdicts = baseInputs.map((input, i) => {
      const ref = refRuns[i];

      if (ref.status !== "ok") {
        return { input, kind: "failed" };
      }

      const refOutput = normalize(ref.stdout);

      if (refOutput.length === 0) {
        return { input, kind: "no_output" };
      }

      const brute = bruteByInput.get(input);

      if (!brute || brute.status !== "ok") {
        return { input, kind: "unchecked", output: refOutput };
      }

      const bruteOutput = normalize(brute.stdout);

      if (bruteOutput.length === 0) {
        return { input, kind: "unchecked", output: refOutput };
      }

      return bruteOutput === refOutput
        ? { input, kind: "agreed", output: refOutput }
        : { input, kind: "disagree", output: refOutput, brute: bruteOutput };
    });

    const compared = verdicts.filter(
      (v) => v.kind === "agreed" || v.kind === "disagree",
    ).length;

    const disagreed = verdicts.filter((v) => v.kind === "disagree").length;
    const unchecked = verdicts.filter((v) => v.kind === "unchecked").length;

    if (compared > 0 && disagreed / compared > MAX_DISAGREE_RATIO) {
      throw new PipelineError(
        `The two AI solutions disagree on ${disagreed} of ${compared} checked inputs, so the tests cannot be trusted. Try generating again.`,
      );
    }

    if (unchecked > verdicts.length / 2) {
      flag(
        "warn",
        `The brute-force solution could not run on ${unchecked} of ${verdicts.length} inputs, so most outputs were checked by the reference solution alone.`,
      );
    }

    // examples: the solution decides the output, the statement's claim is checked against it
    let examplesCorrected = 0;
    const examples = [];

    statement.examples.forEach((example, i) => {
      const verdict = verdicts[i];

      if (verdict.kind === "failed") {
        flag("error", `Example ${i + 1} was removed because the reference solution could not run on it.`);
        return;
      }

      if (verdict.kind === "no_output") {
        flag("error", `Example ${i + 1} was removed because the reference solution produced no output.`);
        return;
      }

      if (verdict.kind === "disagree") {
        flag("error", `Example ${i + 1} was removed because the two solutions disagree on it.`);
        return;
      }

      if (normalize(example.output) !== verdict.output) {
        examplesCorrected++;
        flag("warn", `Example ${i + 1}: the output written in the statement did not match what the solution prints, so it was replaced. Read its explanation again to be sure it still fits.`);
        examples.push({ ...example, output: verdict.output });
      } else {
        examples.push(example);
      }
    });

    if (examples.length === 0) {
      throw new PipelineError("None of the examples could be confirmed by running the solutions.");
    }

    // hidden tests from the small inputs
    const smallVerdicts = verdicts.slice(statement.examples.length);

    const droppedFailed = smallVerdicts.filter(
      (v) => v.kind === "failed",
    ).length;

    const droppedNoOutput = smallVerdicts.filter(
      (v) => v.kind === "no_output",
    ).length;

    const droppedDisagree =
      disagreed -
      verdicts
        .slice(0, statement.examples.length)
        .filter((v) => v.kind === "disagree").length;

    const testCases = smallVerdicts
      .filter(
        (v) =>
          (v.kind === "agreed" || v.kind === "unchecked") &&
          typeof v.output === "string" &&
          v.output.length > 0,
      )
      .map((v) => ({
        input: v.input,
        expectedOutput: v.output,
        source: "ai",
      }));

    if (droppedFailed > 0) {
      flag("info", `${droppedFailed} generated inputs were dropped because the reference solution could not run on them.`);
    }

    if (droppedNoOutput > 0) {
      flag("warn", `${droppedNoOutput} generated inputs were dropped because the reference solution produced no output.`);
    }

    if (droppedDisagree > 0) {
      flag("warn", `${droppedDisagree} generated inputs were dropped because the two solutions gave different answers.`);
    }

    // 5. large tests, made by the generator and answered by the reference solution only
    let largeTests = 0;
    let droppedLargeNoOutput = 0;

    if (!tests.generator.trim()) {
      flag("warn", "No generator was produced, so there are no large tests to catch slow solutions.");
    } else {
      const generated = await deps.execute(
        LARGE_TEST_SEEDS.map((seed) => ({
          language: LANGUAGE,
          code: tests.generator,
          stdin: `${seed}\n`,
          timeLimit: GENERATOR_TIME_LIMIT,
          memoryLimit: MEMORY_LIMIT,
        })),
      );

      const usable = unique(
        generated
          .filter((g) => g.status === "ok")
          .map((g) => g.stdout.replace(/\r\n/g, "\n").trimEnd())
          .filter(
            (input) =>
              input.length > 0 &&
              input.length <= MAX_LARGE_INPUT_CHARS,
          ),
      ).filter((input) => !exampleKeys.has(normalize(input)));

      if (usable.length < LARGE_TEST_SEEDS.length) {
        flag("warn", `The test generator produced ${usable.length} usable large inputs out of ${LARGE_TEST_SEEDS.length}.`);
      }

      const largeRuns = await runPython(
        deps,
        solution.code,
        usable,
        statement.timeLimit,
      );

      usable.forEach((input, i) => {
        if (largeRuns[i].status === "ok") {
          const expectedOutput = normalize(largeRuns[i].stdout);

          if (expectedOutput.length === 0) {
            droppedLargeNoOutput++;
            return;
          }

          testCases.push({
            input,
            expectedOutput,
            source: "ai",
          });

          largeTests++;
        } else if (largeRuns[i].status === "time_limit_exceeded") {
          flag("warn", `The reference solution was too slow on a large generated input (over ${statement.timeLimit}s). Either the constraints are too big or the solution is not efficient enough.`);
        } else {
          flag("warn", "The reference solution failed on a large generated input.");
        }
      });

      if (droppedLargeNoOutput > 0) {
        flag("warn", `${droppedLargeNoOutput} large generated inputs were dropped because the reference solution produced no output.`);
      }
    }

    // Final defensive check: never persist an empty expected output.
    const validTestCases = testCases.filter(
      (test) =>
        typeof test.expectedOutput === "string" &&
        test.expectedOutput.length > 0,
    );

    // never two identical hidden tests
    const hiddenTests = unique(validTestCases.map((t) => t.input)).map(
      (input) => validTestCases.find((t) => t.input === input),
    );

    if (hiddenTests.length < MIN_HIDDEN_TESTS) {
      throw new PipelineError(
        `Only ${hiddenTests.length} usable hidden tests were produced, at least ${MIN_HIDDEN_TESTS} are needed.`,
      );
    }

    flag(
      "info",
      `Reference solution written in Python and checked against an independent brute-force solution on ${compared} inputs.`,
    );

    const { timeLimit, ...statementFields } = statement;

    return {
      statement: { ...statementFields, examples },
      timeLimit,
      solution,
      testCases: hiddenTests,
      // no error flags means every example and test was confirmed by running the code
      validated: !flags.some((f) => f.level === "error"),
      report: {
        model: config.GEMINI_MODEL,
        flags,
        stats: {
          hiddenTests: hiddenTests.length,
          smallTests: hiddenTests.length - largeTests,
          largeTests,
          crossChecked: compared,
          droppedFailed,
          droppedNoOutput,
          droppedDisagree,
          droppedLargeNoOutput,
          examplesCorrected,
        },
        tokens: deps.usage.tokens,
        durationSeconds: Math.round((Date.now() - started) / 1000),
      },
    };
  } catch (error) {
    // the services throw their own errors, the admin only needs the message
    if (error instanceof AiError || error instanceof ExecutionError) {
      throw new PipelineError(
        error instanceof ExecutionError
          ? `The code runner is unavailable: ${error.message}`
          : error.message,
      );
    }

    throw error;
  }
};