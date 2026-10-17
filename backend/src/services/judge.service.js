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