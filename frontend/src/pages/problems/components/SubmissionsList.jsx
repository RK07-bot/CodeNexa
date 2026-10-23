import { LANGUAGES } from "../../../lib/languages.js";
import { timeAgo } from "../../../lib/timeAgo.js";

const verdicts = {
  accepted: { label: "Accepted", color: "text-emerald-400" },
  wrong_answer: { label: "Wrong answer", color: "text-red-400" },
  runtime_error: { label: "Runtime error", color: "text-red-400" },
  compile_error: { label: "Compile error", color: "text-red-400" },
  time_limit_exceeded: { label: "Time limit exceeded", color: "text-amber-400" },
};

const SubmissionsList = ({ submissions }) => {
  if (submissions.status === "loading") {
    return <p className="p-6 text-sm text-white/40">Loading your submissions...</p>;
  }

  if (submissions.status === "failed") {
    return <p className="p-6 text-sm text-red-400">Could not load your submissions.</p>;
  }

  if (submissions.items.length === 0) {
    return (
      <p className="p-6 text-sm text-white/40">
        No submissions yet. Submit a solution and it will show up here.
      </p>
    );
  }

  return (
    <ul>
      {submissions.items.map((s) => {
        const verdict = verdicts[s.verdict];
        const language = LANGUAGES.find((l) => l.id === s.language)?.label ?? s.language;

        return (
          <li
            key={s._id}
            className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-3.5 last:border-b-0"
          >
            <div>
              <p className={`text-sm font-medium ${verdict.color}`}>{verdict.label}</p>
              <p className="mt-0.5 text-xs text-white/40">
                {language} · {timeAgo(s.createdAt)}
              </p>
            </div>
            <span className="font-mono text-xs text-white/55">
              {s.passed}/{s.total}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default SubmissionsList;