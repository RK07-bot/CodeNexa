import { useState } from "react";
import { Link } from "react-router-dom";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";
import useNow from "../../../hooks/useNow.js";
import { formatClock, formatDuration } from "../../../lib/formatDuration.js";

const SessionHeader = ({ session, people, clockOffset, onEnd, ending }) => {
  const now = useNow();
  const [confirming, setConfirming] = useState(false);
  const completed = session.status === "completed";

  const elapsed = session.startedAt ? now + clockOffset - Date.parse(session.startedAt) : 0;

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 lg:h-11 lg:flex-nowrap">
      <Link
        to="/"
        className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-85"
      >
        Code
        <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
          Nexa
        </span>
      </Link>

      <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-white/8 bg-card px-3 py-1.5">
        <span className="truncate text-sm font-medium text-white">{session.problem.title}</span>
        <DifficultyBadge difficulty={session.problem.difficulty} />
        <span className="hidden font-mono text-xs tracking-wider text-white/35 md:inline">
          {session.roomCode}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex -space-x-2">
          {people.map((p) => (
            <span
              key={p.username}
              title={`${p.username}${p.connected ? "" : " (disconnected)"}`}
              className={`grid size-8 place-items-center rounded-full border-2 border-background text-xs font-semibold uppercase ${
                p.connected ? "bg-primary-start/25 text-primary-start" : "bg-white/10 text-white/40"
              }`}
            >
              {p.username[0]}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-recessed px-3 py-1.5">
          <span
            className={`size-1.5 rounded-full ${completed ? "bg-white/30" : "animate-pulse bg-emerald-400"}`}
          />
          <span className="font-mono text-xs font-medium tabular-nums text-white/75">
            {completed ? formatDuration(session.durationSeconds) : formatClock(elapsed)}
          </span>
        </div>

        {!completed &&
          (confirming ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-white/55 sm:inline">End for both of you?</span>
              <button
                type="button"
                onClick={onEnd}
                disabled={ending}
                className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ending ? "Ending..." : "Yes, end"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={ending}
                className="rounded-lg border border-white/8 px-3 py-1.5 text-xs font-medium text-white/65 transition-colors duration-200 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors duration-200 hover:bg-red-400/10"
            >
              End session
            </button>
          ))}
      </div>
    </header>
  );
};

export default SessionHeader;