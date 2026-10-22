import { useState } from "react";
import { CircleCheck, CircleX, Clock } from "lucide-react";

const tones = {
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  danger: "border-red-400/30 bg-red-400/10 text-red-400",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  neutral: "border-white/8 bg-recessed text-white/65",
};

const labels = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  compile_error: "Compile error",
  runtime_error: "Runtime error",
  time_limit_exceeded: "Time limit exceeded",
};

const toneOf = (status) =>
  status === "accepted" ? "success" : status === "time_limit_exceeded" ? "warning" : "danger";

const Block = ({ label, text }) => (
  <div className="min-w-0">
    <p className="mb-1 text-xs text-white/45">{label}</p>
    <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-white/8 bg-editor p-2.5 font-mono text-xs text-white/75">
      {text || " "}
    </pre>
  </div>
);

const Banner = ({ tone, icon: Icon, children }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${tones[tone]}`}
  >
    <Icon className="size-4" /> {children}
  </span>
);

const caseOutcome = (r) => {
  if (r.status !== "ok") return { label: labels[r.status], tone: toneOf(r.status) };
  if (r.passed === true) return { label: "Passed", tone: "success" };
  if (r.passed === false) return { label: "Wrong answer", tone: "danger" };
  return { label: "Finished", tone: "neutral" };
};

const dotColors = {
  success: "bg-emerald-400",
  danger: "bg-red-400",
  warning: "bg-amber-400",
  neutral: "bg-white/30",
};

const RunResults = ({ results }) => {
  const [active, setActive] = useState(0);

  // the same build failure repeats for every case, so it is shown once
  if (results.every((r) => r.status === "compile_error")) {
    return (
      <div className="space-y-3">
        <Banner tone="danger" icon={CircleX}>
          Compile error
        </Banner>
        <Block label="Compiler output" text={results[0].stderr} />
      </div>
    );
  }

  const judged = results.filter((r) => r.passed !== null);
  const passedCount = judged.filter((r) => r.passed).length;
  const current = results[active];
  const outcome = caseOutcome(current);

  return (
    <div className="space-y-3">
      {judged.length > 0 && (
        <p className="text-sm text-white/55">
          {passedCount} of {judged.length} examples passed
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {results.map((r, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-xs font-medium transition-colors duration-200 ${
              active === i
                ? "border-primary-start/40 bg-primary-start/10 text-white"
                : "border-white/8 text-white/55 hover:text-white"
            }`}
          >
            <span className={`size-1.5 rounded-full ${dotColors[caseOutcome(r).tone]}`} />
            Case {i + 1}
          </button>
        ))}
      </div>

      <span
        className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[outcome.tone]}`}
      >
        {outcome.label}
      </span>

      <div className="grid gap-3 sm:grid-cols-2">
        <Block label="Input" text={current.input} />
        <Block label="Your output" text={current.stdout} />
        {current.expected !== null && <Block label="Expected" text={current.expected} />}
        {current.stderr && <Block label="Error output" text={current.stderr} />}
      </div>
    </div>
  );
};

const SubmitResult = ({ data }) => {
  const { verdict, passed, total, failedTest, detail } = data;
  const Icon = verdict === "accepted" ? CircleCheck : verdict === "time_limit_exceeded" ? Clock : CircleX;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Banner tone={toneOf(verdict)} icon={Icon}>
          {labels[verdict]}
        </Banner>
        <span className="text-sm text-white/55">
          {passed} / {total} tests passed
        </span>
      </div>

      {failedTest && (
        <p className="text-sm text-white/55">
          Failed on test {failedTest}.
          {verdict === "wrong_answer" && !detail && " This test is hidden, so its input is not shown."}
          {verdict === "time_limit_exceeded" && " Your solution ran longer than the time limit."}
        </p>
      )}

      {detail?.stderr && (
        <Block label={verdict === "compile_error" ? "Compiler output" : "Error output"} text={detail.stderr} />
      )}

      {detail?.input !== undefined && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Block label="Input" text={detail.input} />
          <Block label="Your output" text={detail.actual} />
          <Block label="Expected" text={detail.expected} />
        </div>
      )}
    </div>
  );
};

const ResultView = ({ execution }) =>
  execution.kind === "run" ? (
    <RunResults results={execution.data.results} />
  ) : (
    <SubmitResult data={execution.data} />
  );

export default ResultView;