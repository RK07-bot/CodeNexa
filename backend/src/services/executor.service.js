import config from "../config/env.js";
import { LANGUAGES } from "../config/languages.js";

export class ExecutionError extends Error {}

const BASE_URL = "https://api.onlinecompiler.io";
const MAX_CONCURRENT = 2; // the provider's limit for the whole API key
const MAX_ATTEMPTS = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// only 4 executions can run at once, everything else waits its turn here
let active = 0;
const waiting = [];

const acquire = () =>
  new Promise((resolve) => {
    if (active < MAX_CONCURRENT) {
      active++;
      resolve();
    } else {
      waiting.push(resolve);
    }
  });

const release = () => {
  const next = waiting.shift();
  // a waiting job takes the slot over directly, so the count stays the same
  if (next) next();
  else active--;
};

// free plan allows 30 runs a minute, stay a little under it
const MAX_PER_MINUTE = 28;
const startTimes = [];

const waitForRateSlot = async () => {
  while (true) {
    const now = Date.now();
    while (startTimes.length && now - startTimes[0] >= 60000)
      startTimes.shift();

    if (startTimes.length < MAX_PER_MINUTE) {
      startTimes.push(now);
      return;
    }
    await sleep(60000 - (now - startTimes[0]) + 50);
  }
};

const callApi = async (body) => {
  if (!config.ONLINECOMPILER_API_KEY) {
    console.error("ONLINECOMPILER_API_KEY is not set in .env");
    throw new ExecutionError("OnlineCompiler is not configured");
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await waitForRateSlot();
    let response;
    try {
      response = await fetch(`${BASE_URL}/api/run-code-sync/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: config.ONLINECOMPILER_API_KEY,
        },
        body: JSON.stringify(body),
        // their own timeout is 30 seconds, this only catches a hung connection
        signal: AbortSignal.timeout(40000),
      });
    } catch (err) {
      console.error("OnlineCompiler unreachable:", err.message);
      throw new ExecutionError("OnlineCompiler could not be reached");
    }

    // at capacity on their side, wait a moment and try again
    if (response.status === 429 && attempt < MAX_ATTEMPTS) {
      await sleep(1000 * attempt);
      continue;
    }

    if (!response.ok) {
      console.error(
        "OnlineCompiler error:",
        response.status,
        await response.text(),
      );
      throw new ExecutionError(
        `OnlineCompiler responded with ${response.status}`,
      );
    }

    return response.json();
  }
};

const toResult = (data, { language, timeLimit }) => {
  const stdout = data.output ?? "";
  const stderr = data.error ?? "";
  const ranFor = Number(data.time) || 0; // seconds, compile time not included

  // killed by a signal, or stopped by the provider's own 30 second timeout
  if (
    Number(data.signal) === 9 ||
    data.exit_code === 137 ||
    data.exit_code === 124
  ) {
    return { status: "time_limit_exceeded", stdout, stderr };
  }

  if (data.status !== "success") {
    // a compiled program that never ran has no execution time, so the build must have failed
    if (LANGUAGES[language].compiled && ranFor === 0) {
      return { status: "compile_error", stdout: "", stderr };
    }
    return { status: "runtime_error", stdout, stderr };
  }

  // the provider can't take a time limit, so ours is checked against the reported time
  if (ranFor > timeLimit)
    return { status: "time_limit_exceeded", stdout, stderr };

  return { status: "ok", stdout, stderr };
};

const runOne = async (job) => {
  await acquire();

  try {
    const data = await callApi({
      compiler: LANGUAGES[job.language].compiler,
      code: job.code,
      input: job.stdin,
    });

    return toResult(data, job);
  } finally {
    release();
  }
};

// results come back in the same order as the jobs
export const executeMany = (jobs) => Promise.all(jobs.map(runOne));

export const executeCode = async (job) => (await executeMany([job]))[0];
