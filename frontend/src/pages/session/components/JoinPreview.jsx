import { useState } from "react";
import { Link } from "react-router-dom";
import { joinSession } from "../../../api/sessions.api.js";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";
import { SessionCard } from "./SessionShell.jsx";

const JoinPreview = ({ session, onJoined }) => {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const joinable = session.status === "waiting";

  const handleJoin = async () => {
    setJoining(true);
    setError(null);

    try {
      await joinSession(session.roomCode);
      onJoined();
    } catch (err) {
      const data = err.response?.data;

      setError({
        message: data?.message || "Could not join this room.",
        roomCode: data?.alreadyInRoom ? data.roomCode : null,
      });
      setJoining(false);
    }
  };

  const unavailable =
    session.status === "active"
      ? "This room is full."
      : "This room has ended.";

  return (
    <SessionCard>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">Room invitation</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
        Join {session.host.username}'s room?
      </h1>

      <div className="mt-5 rounded-xl border border-white/8 bg-recessed/60 p-4">
        <p className="text-xs text-white/45">Problem</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-medium text-white">{session.problem.title}</span>
          <DifficultyBadge difficulty={session.problem.difficulty} />
        </div>
        <p className="mt-3 text-xs text-white/45">
          {session.participantCount} of 2 people in the room
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5 text-sm text-red-400">
          {error.message}
          {error.roomCode && (
            <>
              {" "}
              <Link to={`/session/${error.roomCode}`} className="font-medium underline">
                Go to your room
              </Link>
            </>
          )}
        </p>
      )}

      {joinable ? (
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="mt-5 w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {joining ? "Joining..." : "Join room"}
        </button>
      ) : (
        <p className="mt-5 text-sm text-white/55">{unavailable}</p>
      )}

      <Link
        to="/problems"
        className="mt-3 block text-center text-xs text-white/45 transition-colors duration-200 hover:text-white"
      >
        Back to problems
      </Link>
    </SessionCard>
  );
};

export default JoinPreview;