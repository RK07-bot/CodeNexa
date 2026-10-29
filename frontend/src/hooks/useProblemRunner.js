import { useEffect, useRef, useState } from "react";
import { getSubmissions, runCode, submitCode } from "../api/problems.api.js";

const IDLE = { runId: 0, kind: null, status: "idle", data: null, message: "" };

const useProblemRunner = ({ slug, problem, language, code, sessionCode }) => {
  const [inputs, setInputs] = useState([]);
  const [execution, setExecution] = useState(IDLE);
  const [solved, setSolved] = useState(false);
  const [submissions, setSubmissions] = useState({ status: "loading", items: [] });

  // every run gets a number, so a result that arrives after the user moved on can be ignored
  const runCounter = useRef(0);

  useEffect(() => {
    runCounter.current++;
    setExecution(IDLE);
    setInputs(problem ? problem.examples.map((e) => e.input) : []);
    setSolved(problem?.solved ?? false);
  }, [problem]);

  useEffect(() => {
    let cancelled = false;
    setSubmissions({ status: "loading", items: [] });

    getSubmissions(slug)
      .then((res) => {
        if (!cancelled) setSubmissions({ status: "ready", items: res.data.submissions });
      })
      .catch(() => {
        if (!cancelled) setSubmissions({ status: "failed", items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const changeInput = (index, value) =>
    setInputs((prev) => prev.map((v, i) => (i === index ? value : v)));

  const execute = async (kind) => {
    const runId = ++runCounter.current;
    setExecution({ runId, kind, status: "running", data: null, message: "" });

    try {
      const res =
        kind === "run"
          ? await runCode(slug, { language, code, inputs: inputs.slice(0, 5) })
          : await submitCode(slug, {
              language,
              code,
              ...(sessionCode && { session: sessionCode }),
            });

      if (runId !== runCounter.current) return;

      setExecution({ runId, kind, status: "done", data: res.data, message: "" });

      if (kind === "submit") {
        const { submissionId, verdict, passed, total } = res.data;

        if (verdict === "accepted") setSolved(true);

        setSubmissions((prev) => ({
          status: "ready",
          items: [
            { _id: submissionId, language, verdict, passed, total, createdAt: new Date().toISOString() },
            ...prev.items,
          ],
        }));
      }
    } catch (err) {
      if (runId !== runCounter.current) return;

      const data = err.response?.data;

      setExecution({
        runId,
        kind,
        status: "error",
        data: null,
        message:
          data?.errors?.code?.[0] || data?.message || "Something went wrong. Please try again.",
      });
    }
  };

  const running = execution.status === "running" ? execution.kind : null;

  return { inputs, changeInput, execution, execute, running, solved, submissions };
};

export default useProblemRunner;