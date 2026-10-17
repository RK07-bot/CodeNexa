import { useState } from "react";

const tabs = [
  { id: "result", label: "Test result" },
  { id: "testcase", label: "Testcase" },
];

const TestPanel = ({ examples }) => {
  const [tab, setTab] = useState("result");
  const [activeCase, setActiveCase] = useState(0);
  // editable copies of the example inputs, Run will send these later
  const [inputs, setInputs] = useState(() => examples.map((e) => e.input));

  const updateInput = (value) =>
    setInputs((prev) => prev.map((v, i) => (i === activeCase ? value : v)));

  return (
    <div className="flex h-52 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-recessed/70 lg:h-60">
      <div className="flex shrink-0 items-center gap-5 border-b border-white/8 px-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 py-2.5 text-sm font-medium transition-colors duration-200 ${
              tab === t.id
                ? "border-primary-start text-white"
                : "border-transparent text-white/45 hover:text-white/75"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "result" && (
          <p className="grid h-full place-items-center text-sm text-white/40">
            Run your code to see test results.
          </p>
        )}

        {tab === "testcase" && (
          <>
            <div className="flex flex-wrap gap-2">
              {examples.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveCase(i)}
                  className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                    activeCase === i
                      ? "border-primary-start/40 bg-primary-start/10 text-primary-start"
                      : "border-white/8 text-white/55 hover:text-white"
                  }`}
                >
                  Case {i + 1}
                </button>
              ))}
            </div>

            <textarea
              value={inputs[activeCase]}
              onChange={(e) => updateInput(e.target.value)}
              spellCheck={false}
              className="mt-3 h-28 w-full resize-none rounded-xl border border-white/8 bg-editor p-3 font-mono text-xs leading-relaxed text-white/75 outline-none transition-colors duration-200 focus:border-primary-start/50"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TestPanel;