import { useMemo, useState } from "react";
import { endSession } from "../../../api/sessions.api.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import SessionHeader from "./SessionHeader.jsx";
import ReconnectBanner from "./ReconnectBanner.jsx";
import SolveArea from "./SolveArea.jsx";
import CompletedPanel from "./CompletedPanel.jsx";
import CallPanel from "./CallPanel.jsx";
import ChatPanel from "./ChatPanel.jsx";
import ScreenView from "./ScreenView.jsx";
import { StreamAudio } from "./StreamMedia.jsx";

const Workspace = ({ session, presence, chat, call, clockOffset, onEnded }) => {
  const { user } = useAuth();
  const completed = session.status === "completed";

  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [seenId, setSeenId] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // the REST data says who is in the room, live presence says who is connected right now
  const people = useMemo(
    () =>
      session.participants.map((p) => {
        const live = presence?.participants.find(
          (x) => x.username === p.username,
        );

        return {
          ...p,
          connected: live ? live.connected : p.connected,
          disconnectedAt: live?.disconnectedAt ?? null,
        };
      }),
    [session.participants, presence],
  );

  const partner = people.find((p) => p.username !== user.username);
  const partnerScreen =
    call.peer.screen && call.remote.screen
      ? { stream: call.remote.screen, name: partner?.username ?? "Partner" }
      : null;

  // messages that arrived from the partner while the chat was closed
  const lastId = chat.messages.at(-1)?.id ?? null;
  if (chatOpen && seenId !== lastId) setSeenId(lastId);
  const seenIndex = chat.messages.findIndex((m) => m.id === seenId);
  const unread = chatOpen
    ? 0
    : chat.messages
        .slice(seenIndex + 1)
        .filter((m) => m.username !== user.username).length;

  // the enlarged screen goes away by itself when the sharing stops
  const sharing = Boolean(partnerScreen);
  const [wasSharing, setWasSharing] = useState(sharing);
  if (sharing !== wasSharing) {
    setWasSharing(sharing);
    if (!sharing) setExpanded(false);
  }
  const screenOpen = expanded && sharing;

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
          <div className="relative flex min-h-0 min-w-0 flex-1">
            <SolveArea
              key={session.roomCode}
              session={session}
              partnerScreen={partnerScreen}
              onExpandScreen={() => setExpanded(true)}
            />

            {/* covers the problem and the editor, the video call on the right stays in view */}
            {screenOpen && (
              <div className="absolute inset-0 z-10">
                <ScreenView
                  expanded
                  stream={partnerScreen.stream}
                  name={partnerScreen.name}
                  onToggle={() => setExpanded(false)}
                />
              </div>
            )}
          </div>
        )}
        <aside className="flex h-[min(560px,70vh)] min-h-0 shrink-0 flex-col lg:h-auto lg:min-h-0 lg:w-80 xl:w-96">
          {chatOpen ? (
            <ChatPanel
              messages={chat.messages}
              me={user.username}
              onClose={() => setChatOpen(false)}
            />
          ) : (
            <CallPanel
              people={people}
              me={user.username}
              call={call}
              unread={unread}
              onOpenChat={() => setChatOpen(true)}
            />
          )}
        </aside>

        {/* the partner's voice keeps playing while the chat is open */}
        <StreamAudio stream={call.remote.audio} />
      </div>
    </div>
  );
};

export default Workspace;
