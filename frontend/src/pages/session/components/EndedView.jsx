import { Link } from "react-router-dom";
import { CircleCheck, CircleX } from "lucide-react";
import { formatDuration } from "../../../lib/formatDuration.js";
import { SessionCard } from "./SessionShell.jsx";

const ABANDONED = {
  cancelled: "The host cancelled this room.",
  expired: "Nobody joined in time, so the room was closed.",
  disconnected: "A participant disconnected and did not come back in time.",
};

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-white/8 bg-recessed/60 px-3 py-3 text-center">
    <p className="text-lg font-semibold text-white">{value}</p>
    <p className="mt-0.5 text-xs text-white/40">{label}</p>
  </div>
);

const EndedView = ({ session }) => {
  const completed = session.status === "completed";

  return (
    <SessionCard>
      <div
        className={`grid size-12 place-items-center rounded-xl ${
          completed ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
        }`}
      >
        {completed ? <CircleCheck className="size-6" /> : <CircleX className="size-6" />}
      </div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
        {completed ? "Session complete" : "Session ended"}
      </h1>
      <p className="mt-2 text-sm text-white/45">
        {completed
          ? session.problem.title
          : (ABANDONED[session.endReason] ?? "This session has ended.")}
      </p>

      {completed && session.isParticipant && (
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <Stat label="Duration" value={formatDuration(session.durationSeconds)} />
          <Stat label="Submissions" value={session.stats?.submissions ?? 0} />
          <Stat label="Solved" value={session.stats?.solved ? "Yes" : "No"} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2.5">
        <Link
          to={`/problems/${session.problem.slug}`}
          className="rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5"
        >
          Back to the problem
        </Link>
        <Link
          to="/problems"
          className="rounded-xl border border-white/8 py-2.5 text-center text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
        >
          All problems
        </Link>
      </div>
    </SessionCard>
  );
};

export default EndedView;