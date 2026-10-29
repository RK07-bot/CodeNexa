import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Link2 } from "lucide-react";
import { cancelSession } from "../../../api/sessions.api.js";
import CopyButton from "../../../components/CopyButton.jsx";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";
import { formatClock } from "../../../lib/formatDuration.js";
import { SessionCard } from "./SessionShell.jsx";

const WaitingRoom = ({ session }) => {
  const navigate = useNavigate();

  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(session.createdAt));
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Date.now() - new Date(session.createdAt)),
      1000,
    );
    return () => clearInterval(id);
  }, [session.createdAt]);

  const link = `${window.location.origin}/session/${session.roomCode}`;
  const isPublic = session.visibility === "public";

  const handleCancel = async () => {
    setCancelling(true);
    setError("");

    try {
      await cancelSession(session.roomCode);
      navigate(`/problems/${session.problem.slug}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not cancel the room.");
      setCancelling(false);
    }
  };

  return (
    <SessionCard>
      <div className="grid size-12 place-items-center rounded-xl bg-primary-start/10 text-primary-start">
        {isPublic ? <Globe className="size-6" /> : <Link2 className="size-6" />}
      </div>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">Waiting for a partner</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <span className="text-sm text-white/65">{session.problem.title}</span>
        <DifficultyBadge difficulty={session.problem.difficulty} />
      </div>

      <div className="mt-6 rounded-xl border border-white/8 bg-recessed/60 p-4">
        <p className="text-xs text-white/45">Room code</p>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="font-mono text-3xl font-semibold tracking-[0.25em] text-white">
            {session.roomCode}
          </span>
          <CopyButton text={session.roomCode} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
          <span className="truncate font-mono text-xs text-white/45">{link}</span>
          <CopyButton text={link} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2.5 text-sm text-white/65">
        <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
        Waiting for someone to join
        <span className="font-mono text-white/40">{formatClock(elapsed)}</span>
      </div>

      <p className="mt-2 text-xs leading-5 text-white/35">
        {isPublic
          ? "This room is listed for everyone on CodeNexa."
          : "Only people with this code or link can join."}{" "}
        It closes automatically if nobody joins.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCancel}
        disabled={cancelling}
        className="mt-5 w-full rounded-xl border border-white/8 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cancelling ? "Cancelling..." : "Cancel room"}
      </button>
    </SessionCard>
  );
};

export default WaitingRoom;