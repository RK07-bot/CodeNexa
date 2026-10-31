import crypto from "node:crypto";

// A short hash of everything validation depends on: the examples, the hidden
// tests, the reference solution and the limits. The problem must have been loaded
// with +testCases +referenceSolution. If the hash stored at validation time no
// longer matches, something changed since then and the problem must be validated
// again. Test sources (author or ai) are left out, they don't change any result.
export const getProblemFingerprint = (problem) => {
  const payload = {
    examples: problem.examples.map((e) => [e.input, e.output]),
    tests: problem.testCases.map((t) => [t.input, t.expectedOutput]),
    solution: [
      problem.referenceSolution?.language ?? "",
      problem.referenceSolution?.code ?? "",
    ],
    limits: [problem.timeLimit, problem.memoryLimit],
  };

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};