import { useMemo, useState } from "react";
import { endSession } from "../../../api/sessions.api.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import SessionHeader from "./SessionHeader.jsx";
import ReconnectBanner from "./ReconnectBanner.jsx";
import SolveArea from "./SolveArea.jsx";
import CompletedPanel from "./CompletedPanel.jsx";
import ParticipantsPanel from "./ParticipantsPanel.jsx";
import ChatPanel from "./ChatPanel.jsx";

const Workspace = ({ session, presence, chat, clockOffset, onEnded }) => {
  const { user } = useAuth();
  const completed = session.status === "completed";

  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");

  // the REST data says who is in the room, live presence says who is connected right now
  const people = useMemo(
    () =>
      session.participants.map((p) => {
        const live = presence?.participants.find((x) => x.username === p.username);

        return {
          ...p,
          connected: live ? live.connected : p.connected,
          disconnectedAt: live?.disconnectedAt ?? null,
        };
      }),
    [session.participants, presence],
  );

  const partner = people.find((p) => p.username !== user.username);

  const handleEnd = async () => {
    setEnding(true);
    setEndError("");

    try {
      await endSession(session.roomCode);
      onEnded();
    } catch (err) {
      setEndError(err.response?.data?.message || "Could not end the session.");
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col gap-3 p-3 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <SessionHeader
        session={session}
        people={people}
        clockOffset={clockOffset}
        onEnd={handleEnd}
        ending={ending}
      />

      <ReconnectBanner
        session={session}
        partner={partner}
        graceSeconds={presence?.graceSeconds ?? 60}
        clockOffset={clockOffset}
      />

      {endError && (
        <p className="shrink-0 rounded-xl border border-red-500/15 bg-red-500/7 px-4 py-2.5 text-sm text-red-400">
          {endError}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        {completed ? (
          <CompletedPanel session={session} partner={partner} />
        ) : (
          // a new problem in the same chain starts from a clean editor state
          <SolveArea key={session.roomCode} session={session} />
        )}

        <aside className="flex h-[520px] shrink-0 flex-col gap-3 lg:h-auto lg:min-h-0 lg:w-72 xl:w-80">
          <ParticipantsPanel people={people} me={user.username} />
          <ChatPanel messages={chat.messages} me={user.username} />
        </aside>
      </div>
    </div>
  );
};

export default Workspace;