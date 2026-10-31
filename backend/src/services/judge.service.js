import { executeCode } from "./executor.service.js"

const BATCH_SIZE = 4;

// trailing spaces and blank lines at the end shouldn't decide a verdict
const normalize = (text = "") =>
  text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

const run = (problem, { language, code }, input) =>
  executeCode({
    language,
    code,
    stdin: `${input}\n`,
    timeLimit: problem.timeLimit,
    memoryLimit: problem.memoryLimit,
  });

export const runWithInputs = async (problem, { language, code, inputs }) =>
  Promise.all(
    inputs.map(async (input) => {
      const result = await run(problem, { language, code }, input);

      // an edited input has no known answer, so it only shows output
      const example = problem.examples.find((e) => normalize(e.input) === normalize(input));
      const expected = example ? example.output : null;
      const passed =
        expected === null || result.status !== "ok"
          ? null
          : normalize(result.stdout) === normalize(expected);

      return { input, expected, passed, ...result };
    }),
  );

const describeFailure = (problem, index, test, result) => {
  if (result.status === "compile_error" || result.status === "runtime_error") {
    return { stderr: result.stderr };
  }

  // examples are public, hidden tests are not, so only examples get the full comparison
  if (result.status === "wrong_answer" && index < problem.examples.length) {
    return { input: test.input, expected: test.expectedOutput, actual: normalize(result.stdout) };
  }

  return null;
};

export const judgeSubmission = async (problem, { language, code }) => {
  const tests = [
    ...problem.examples.map((e) => ({ input: e.input, expectedOutput: e.output })),
    ...problem.testCases,
  ];

  for (let start = 0; start < tests.length; start += BATCH_SIZE) {
    const batch = tests.slice(start, start + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (test) => {
        const result = await run(problem, { language, code }, test.input);
        if (result.status !== "ok") return result;

        const matches = normalize(result.stdout) === normalize(test.expectedOutput);
        return { ...result, status: matches ? "passed" : "wrong_answer" };
      }),
    );

    const failedAt = results.findIndex((r) => r.status !== "passed");

    if (failedAt !== -1) {
      const index = start + failedAt;

      return {
        verdict: results[failedAt].status,
        passed: index,
        total: tests.length,
        failedTest: index + 1,
        detail: describeFailure(problem, index, tests[index], results[failedAt]),
      };
    }
  }

  return { verdict: "accepted", passed: tests.length, total: tests.length };
};

// long outputs are cut so one bad solution can't produce a huge response
const MAX_SHOWN = 300;
const clip = (text = "") =>
  text.length > MAX_SHOWN ? `${text.slice(0, MAX_SHOWN)}...` : text;

// Used by the admin "Validate" button. Unlike judgeSubmission, which stops at the
// first failure, this runs every example and hidden test and reports each one.
// The caller makes sure there is at least one test.
export const runAllTests = async (problem, { language, code }) => {
  const tests = [
    ...problem.examples.map((e) => ({
      kind: "example",
      input: e.input,
      expectedOutput: e.output,
    })),
    ...problem.testCases.map((t) => ({
      kind: "hidden",
      source: t.source,
      input: t.input,
      expectedOutput: t.expectedOutput,
    })),
  ];

  const check = async (test) => {
    const result = await run(problem, { language, code }, test.input);
    const actual = normalize(result.stdout);

    let status = result.status;
    if (status === "ok") {
      status = actual === normalize(test.expectedOutput) ? "passed" : "wrong_answer";
    }

    return {
      kind: test.kind,
      source: test.source ?? null,
      status,
      input: clip(test.input),
      expected: clip(test.expectedOutput),
      actual: clip(actual),
      stderr: clip(result.stderr),
    };
  };

  // the first test runs alone: if the code does not even compile, every other
  // test would fail the same way, so there is no point spending runs on them
  const first = await check(tests[0]);

  if (first.status === "compile_error") {
    return {
      total: tests.length,
      passed: 0,
      ran: 1,
      stopped: "compile_error",
      results: [first],
    };
  }

  // the executor itself only lets 4 runs go at once, the rest wait in its queue
  const rest = await Promise.all(tests.slice(1).map(check));
  const results = [first, ...rest];

  return {
    total: tests.length,
    passed: results.filter((r) => r.status === "passed").length,
    ran: results.length,
    stopped: null,
    results,
  };
};