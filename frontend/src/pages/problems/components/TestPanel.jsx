
import { useEffect, useState } from "react";
import ResultView from "./ResultView.jsx";

const tabs = [
  { id: "result", label: "Test result" },
  { id: "testcase", label: "Testcase" },
];

const TestPanel = ({ inputs, onInputChange, execution }) => {
  const [tab, setTab] = useState("result");
  const [activeCase, setActiveCase] = useState(0);

  // Show results automatically after a new run or submission.
  useEffect(() => {
    if (execution.runId > 0) setTab("result");
  }, [execution.runId]);

  // Keep the selected testcase valid if the inputs change.
  useEffect(() => {
    setActiveCase((current) =>
      Math.min(current, Math.max(inputs.length - 1, 0))
    );
  }, [inputs.length]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-recessed/70">
      <div className="flex shrink-0 items-center gap-5 border-b border-white/8 px-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 py-2.5 text-sm font-medium transition-colors duration-200 ${
              tab === item.id
                ? "border-primary-start text-white"
                : "border-transparent text-white/45 hover:text-white/75"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor:
            "var(--color-primary-start) var(--color-recessed)",
        }}
      >
        {tab === "result" && (
          <>
            {execution.status === "idle" && (
              <p className="grid h-full place-items-center text-sm text-white/40">
                Run your code to see test results.
              </p>
            )}

            {execution.status === "running" && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="size-6 animate-spin rounded-full border-2 border-white/10 border-t-primary-start" />

                <p className="text-sm text-white/55">
                  {execution.kind === "run"
                    ? "Running your code..."
                    : "Judging your solution against all tests..."}
                </p>

                <p className="text-xs text-white/30">
                  Very slow code can take up to 30 seconds.
                </p>
              </div>
            )}

            {execution.status === "error" && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-400">
                {execution.message}
              </p>
            )}

            {execution.status === "done" && (
              <ResultView
                key={execution.runId}
                execution={execution}
              />
            )}
          </>
        )}

        {tab === "testcase" && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {inputs.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveCase(index)}
                  className={`shrink-0 rounded-lg border px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                    activeCase === index
                      ? "border-primary-start/40 bg-primary-start/10 text-primary-start"
                      : "border-white/8 text-white/55 hover:text-white"
                  }`}
                >
                  Case {index + 1}
                </button>
              ))}
            </div>

            <textarea
              value={inputs[activeCase] ?? ""}
              onChange={(event) =>
                onInputChange(activeCase, event.target.value)
              }
              spellCheck={false}
              className="mt-3 h-36 w-full resize-none rounded-xl border border-white/8 bg-editor p-3 font-mono text-xs leading-relaxed text-white/75 outline-none transition-colors duration-200 focus:border-primary-start/50"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TestPanel;
