import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleAlert, SearchX } from "lucide-react";
import { getSession } from "../../api/sessions.api.js";
import { useSocket } from "../../context/SocketContext.jsx";
import SessionShell, { SessionCard } from "./components/SessionShell.jsx";
import JoinPreview from "./components/JoinPreview.jsx";
import WaitingRoom from "./components/WaitingRoom.jsx";
import Workspace from "./components/Workspace.jsx";
import EndedView from "./components/EndedView.jsx";
import TakenOver from "./components/TakenOver.jsx";

const SessionPage = () => {
  const { code: rawCode } = useParams();
  const code = (rawCode ?? "").toUpperCase();
  const navigate = useNavigate();
  const { socket, joinRoom, leaveRoom, takenOver } = useSocket();

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [presence, setPresence] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadedFor = useRef(null);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    // a different room starts from a clean loading state, a live refresh keeps what is on screen
    if (loadedFor.current !== code) {
      loadedFor.current = code;
      setStatus("loading");
      setSession(null);
      setPresence(null);
    }

    getSession(code)
      .then((res) => {
        if (cancelled) return;
        setSession(res.data.session);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err.response?.data?.message || "Could not load this room.");
        setStatus((prev) =>
          err.response?.status === 404 ? "notfound" : prev === "ready" ? prev : "error",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [code, reloadKey]);

  const isOpen = session?.status === "waiting" || session?.status === "active";
  const shouldJoin = Boolean(session?.isParticipant && isOpen);

  // being on the page means being in the room, leaving the page starts the reconnect grace period
  useEffect(() => {
    if (!shouldJoin) return undefined;

    joinRoom(code);
    return () => leaveRoom();
  }, [shouldJoin, code, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!socket) return undefined;

    const onPresence = (payload) => {
      if (payload.roomCode === code) setPresence(payload);
    };

    const onUpdated = (payload) => {
      if (payload.roomCode === code) reload();
    };

    const onNext = ({ roomCode }) => navigate(`/session/${roomCode}`);

    socket.on("presence:update", onPresence);
    socket.on("session:updated", onUpdated);
    socket.on("session:next", onNext);

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("session:updated", onUpdated);
      socket.off("session:next", onNext);
    };
  }, [socket, code, navigate]);

  if (status === "loading") {
    return (
      <SessionShell>
        <span className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-primary-start" />
      </SessionShell>
    );
  }

  if (status === "notfound" || status === "error") {
    const notFound = status === "notfound";

    return (
      <SessionShell>
        <SessionCard>
          {notFound ? (
            <SearchX className="size-8 text-white/30" />
          ) : (
            <CircleAlert className="size-8 text-red-400" />
          )}
          <h1 className="mt-4 text-xl font-semibold text-white">
            {notFound ? "Room not found" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-sm text-white/45">
            {notFound ? "Check the code or ask for a new link." : message}
          </p>
          {!notFound && (
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
            >
              Try again
            </button>
          )}
        </SessionCard>
      </SessionShell>
    );
  }

  if (takenOver?.roomCode === code && session.isParticipant && isOpen) {
    return (
      <SessionShell>
        <TakenOver onUseHere={() => joinRoom(code)} />
      </SessionShell>
    );
  }

  if (!session.isParticipant) {
    return (
      <SessionShell>
        <JoinPreview session={session} onJoined={reload} />
      </SessionShell>
    );
  }

  if (session.status === "waiting") {
    return (
      <SessionShell>
        <WaitingRoom session={session} />
      </SessionShell>
    );
  }

  if (session.status === "active") {
    return (
      <SessionShell>
        <Workspace session={session} presence={presence} onEnded={reload} />
      </SessionShell>
    );
  }

  return (
    <SessionShell>
      <EndedView session={session} />
    </SessionShell>
  );
};

export default SessionPage;