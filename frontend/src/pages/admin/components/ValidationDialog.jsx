import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { validateProblem } from "../../../api/admin.api.js";
import Spinner from "../../../components/Spinner.jsx";

const STATUS = {
  passed: { label: "Passed", style: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" },
  wrong_answer: { label: "Wrong answer", style: "border-red-400/30 bg-red-400/10 text-red-400" },
  runtime_error: { label: "Runtime error", style: "border-red-400/30 bg-red-400/10 text-red-400" },
  time_limit_exceeded: { label: "Time limit", style: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
  compile_error: { label: "Compile error", style: "border-amber-400/30 bg-amber-400/10 text-amber-400" },
};

const Block = ({ label, text }) => (
  <div className="min-w-0">
    <p className="text-[11px] uppercase tracking-wider text-white/35">{label}</p>
    <pre className="mt-1 max-h-32 overflow-auto rounded-lg border border-white/8 bg-editor p-2.5 font-mono text-xs leading-relaxed text-white/75">
      {text || "(empty)"}
    </pre>
  </div>
);

// runs the reference solution against every test as soon as it opens
const ValidationDialog = ({ problem, onClose }) => {
  const [state, setState] = useState("running"); // running | done | error
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    validateProblem(problem._id)
      .then((res) => {
        if (cancelled) return;
        setReport(res.data);
        setState("done");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Validation failed.");
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [problem._id]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/8 bg-card shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/35">
              Validate
            </p>
            <h2
              id="validation-title"
              className="mt-1 truncate text-lg font-semibold text-white"
            >
              {problem.title || "Untitled draft"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-white/45 transition-colors duration-200 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {state === "running" && (
            <div className="flex flex-col items-center py-10 text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-sm text-white/65">
                Running the reference solution against every test...
              </p>
              <p className="mt-1 text-xs text-white/35">
                Only a few tests run at a time, so this can take a little while.
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center py-10 text-center">
              <CircleAlert className="size-8 text-red-400" />
              <p className="mt-3 text-sm text-white/65">{error}</p>
            </div>
          )}

          {state === "done" && (
            <>
              <div
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                  report.valid
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                    : "border-red-400/30 bg-red-400/10 text-red-400"
                }`}
              >
                {report.valid ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                )}
                <p className="text-sm">
                  {report.valid
                    ? `All ${report.total} tests passed. This problem can now be published.`
                    : report.stopped === "compile_error"
                      ? "The reference solution does not compile. The other tests were not run."
                      : `${report.passed} of ${report.total} tests passed. Fix the failing tests or the solution, then validate again.`}
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {report.results.map((result, i) => {
                  const info = STATUS[result.status] ?? STATUS.runtime_error;
                  const failed = result.status !== "passed";

                  return (
                    <li
                      key={i}
                      className="rounded-xl border border-white/8 bg-recessed/60"
                    >
                      <details>
                        <summary
                          className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                            failed ? "cursor-pointer" : "cursor-default list-none"
                          }`}
                        >
                          <span className="flex items-center gap-2 text-sm text-white/75">
                            Test {i + 1}
                            <span className="text-xs text-white/35">
                              {result.kind === "example"
                                ? "Example"
                                : `Hidden${result.source ? ` · ${result.source}` : ""}`}
                            </span>
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${info.style}`}
                          >
                            {info.label}
                          </span>
                        </summary>

                        {failed && (
                          <div className="grid gap-3 border-t border-white/8 px-4 py-3 sm:grid-cols-2">
                            <Block label="Input" text={result.input} />
                            <Block label="Expected" text={result.expected} />
                            <Block label="Actual" text={result.actual} />
                            {result.stderr && (
                              <Block label="Error output" text={result.stderr} />
                            )}
                          </div>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-white/8 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default ValidationDialog;