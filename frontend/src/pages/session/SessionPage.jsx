import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CircleAlert, SearchX } from "lucide-react";
import { getSession } from "../../api/sessions.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import useCall from "../../hooks/useCall.js";
import SessionShell, { SessionCard } from "./components/SessionShell.jsx";
import JoinPreview from "./components/JoinPreview.jsx";
import WaitingRoom from "./components/WaitingRoom.jsx";
import Workspace from "./components/Workspace.jsx";
import EndedView from "./components/EndedView.jsx";
import TakenOver from "./components/TakenOver.jsx";

// how far this computer's clock is from the server's, so countdowns use the server's time
const offsetFrom = (serverTime) => (serverTime ? Date.parse(serverTime) - Date.now() : 0);

const SessionPage = () => {
  const { code: rawCode } = useParams();
  const code = (rawCode ?? "").toUpperCase();
  const navigate = useNavigate();
  const { socket, joinRoom, leaveRoom, takenOver } = useSocket();
  const { user } = useAuth();

  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [presence, setPresence] = useState(null);
  const [chat, setChat] = useState({ chainId: null, messages: [] });
  const [clockOffset, setClockOffset] = useState(0);
  // who the call is with, kept while the next room of the chain loads so the call does not drop
  const [callInfo, setCallInfo] = useState({ partner: null, on: false });
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

        const loaded = res.data.session;
        const chainId = loaded.chainId ?? null;

        setSession(loaded);
        setClockOffset(offsetFrom(loaded.serverTime));
        setCallInfo({
          partner: loaded.participants?.find((p) => p.username !== user.username)?.username ?? null,
          on: Boolean(
            loaded.isParticipant &&
              (loaded.status === "active" ||
                (loaded.status === "completed" && loaded.visibility === "private" && !loaded.nextRoomCode)),
          ),
        });
        // the next problem of the same chain keeps the conversation, a new chain starts empty
        setChat((prev) => (prev.chainId === chainId ? prev : { chainId, messages: [] }));
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
  }, [code, reloadKey, user.username]);

  const isOpen = session?.status === "waiting" || session?.status === "active";
  // a finished private room keeps the call and chat alive so the pair can pick another problem
  const canContinue =
    session?.status === "completed" && session.visibility === "private" && !session.nextRoomCode;
  const shouldJoin = Boolean(session?.isParticipant && (isOpen || canContinue));

  // being on the page means being in the room, leaving the page starts the reconnect grace period
  useEffect(() => {
    if (!shouldJoin) return undefined;

    joinRoom(code);
    return () => leaveRoom();
  }, [shouldJoin, code, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!socket) return undefined;

    const onPresence = (payload) => {
      if (payload.roomCode !== code) return;
      setPresence(payload);
      setClockOffset(offsetFrom(payload.serverTime));
    };

    const onUpdated = (payload) => {
      if (payload.roomCode === code) reload();
    };

    const onNext = ({ roomCode }) => navigate(`/session/${roomCode}`);

    const onChat = (incoming) =>
      setChat((prev) =>
        prev.messages.some((m) => m.id === incoming.id)
          ? prev
          : { ...prev, messages: [...prev.messages, incoming].slice(-200) },
      );

    socket.on("presence:update", onPresence);
    socket.on("session:updated", onUpdated);
    socket.on("session:next", onNext);
    socket.on("chat:message", onChat);

    return () => {
      socket.off("presence:update", onPresence);
      socket.off("session:updated", onUpdated);
      socket.off("session:next", onNext);
      socket.off("chat:message", onChat);
    };
  }, [socket, code, navigate]);

  const call = useCall({
    socket,
    enabled: callInfo.on && takenOver?.roomCode !== code,
    roomCode: code,
    me: user.username,
    partner: callInfo.partner,
    presence,
  });

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

  if (takenOver?.roomCode === code && shouldJoin) {
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

  if (session.status === "active" || canContinue) {
    return (
      <Workspace
        session={session}
        presence={presence}
        chat={chat}
        call={call}
        clockOffset={clockOffset}
        onEnded={reload}
      />
    );
  }

  return (
    <SessionShell>
      <EndedView session={session} />
    </SessionShell>
  );
};

export default SessionPage;