import { useState } from "react";
import { endSession } from "../../../api/sessions.api.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { SessionCard } from "./SessionShell.jsx";

const Workspace = ({ session, presence, onEnded }) => {
  const { user } = useAuth();
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  const people = presence?.participants ?? session.participants;
  const partner = people.find((p) => p.username !== user.username);

  const handleEnd = async () => {
    setEnding(true);
    setError("");

    try {
      await endSession(session.roomCode);
      onEnded();
    } catch (err) {
      setError(err.response?.data?.message || "Could not end the session.");
      setEnding(false);
    }
  };

  return (
    <SessionCard>
      <h1 className="text-2xl font-semibold tracking-tight text-white">{session.problem.title}</h1>
      <p className="mt-2 text-sm text-white/45">
        The shared workspace arrives in the next step. For now this screen shows the room is live.
      </p>

      <p className="mt-5 flex items-center gap-2 text-sm text-white/65">
        <span
          className={`size-2 rounded-full ${partner?.connected ? "bg-emerald-400" : "bg-red-400"}`}
        />
        {partner?.username ?? "Partner"} is {partner?.connected ? "connected" : "disconnected"}
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleEnd}
        disabled={ending}
        className="mt-5 w-full rounded-xl border border-red-400/20 bg-red-400/5 py-2.5 text-sm font-medium text-red-400 transition-colors duration-200 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ending ? "Ending..." : "End session"}
      </button>
    </SessionCard>
  );
};

export default Workspace;