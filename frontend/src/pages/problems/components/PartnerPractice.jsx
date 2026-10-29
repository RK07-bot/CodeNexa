import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleAlert, Globe, KeyRound, Link2, LogIn, Users } from "lucide-react";
import { createSession, getMyOpenSession } from "../../../api/sessions.api.js";
import useLobby from "../../../hooks/useLobby.js";
import useJoinRoom from "../../../hooks/useJoinRoom.js";
import { timeAgo } from "../../../lib/timeAgo.js";

const VISIBILITY = [
  { id: "private", label: "Private", hint: "Only people with the room code can join", icon: Link2 },
  { id: "public", label: "Public", hint: "Anyone on CodeNexa can join", icon: Globe },
];

const CODE_PATTERN = /^[A-Z0-9]{6}$/;

const Section = ({ title, children }) => (
  <section>
    <h2 className="text-sm font-semibold text-white">{title}</h2>
    <div className="mt-3">{children}</div>
  </section>
);

const PartnerPractice = ({ problem }) => {
  const navigate = useNavigate();

  const [visibility, setVisibility] = useState("private");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [myRoom, setMyRoom] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  const lobby = useLobby({ problem: problem.slug, status: "waiting", limit: 10 });
  const { join, joining, error: joinError } = useJoinRoom();

  useEffect(() => {
    let cancelled = false;

    getMyOpenSession()
      .then((res) => {
        if (!cancelled) setMyRoom(res.data.session);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");

    try {
      const res = await createSession({ problem: problem.slug, visibility });
      navigate(`/session/${res.data.session.roomCode}`);
    } catch (err) {
      const data = err.response?.data;

      if (data?.alreadyInRoom) setMyRoom({ roomCode: data.roomCode });
      setCreateError(data?.message || "Could not create the room.");
    } finally {
      setCreating(false);
    }
  };

  const handleCodeJoin = (e) => {
    e.preventDefault();

    const value = codeInput.trim().toUpperCase();

    if (!CODE_PATTERN.test(value)) {
      setCodeError("Room codes are 6 characters, like QWM473.");
      return;
    }

    navigate(`/session/${value}`);
  };

  const busy = Boolean(myRoom);

  return (
    <div className="space-y-7 p-5 sm:p-6">
      {myRoom?.roomCode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3">
          <p className="text-sm text-amber-300">
            You are already in an open room
            {myRoom.problem?.title ? ` for ${myRoom.problem.title}` : ""}.
          </p>
          <Link
            to={`/session/${myRoom.roomCode}`}
            className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors duration-200 hover:bg-amber-400/10"
          >
            Go to room
          </Link>
        </div>
      )}

      <Section title="Create a room">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {VISIBILITY.map((option) => {
            const active = visibility === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setVisibility(option.id)}
                aria-pressed={active}
                className={`rounded-xl border p-3.5 text-left transition-all duration-200 ${
                  active
                    ? "border-primary-start/50 bg-primary-start/10"
                    : "border-white/8 bg-recessed/60 hover:border-white/15"
                }`}
              >
                <span
                  className={`flex items-center gap-2 text-sm font-medium ${
                    active ? "text-primary-start" : "text-white"
                  }`}
                >
                  <option.icon className="size-4" /> {option.label}
                </span>
                <span className="mt-1 block text-xs text-white/45">{option.hint}</span>
              </button>
            );
          })}
        </div>

        {createError && (
          <p className="mt-3 rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5 text-sm text-red-400">
            {createError}
          </p>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || busy}
          className="mt-4 w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {creating ? "Creating room..." : "Create room"}
        </button>
      </Section>

      <Section title="Join with a room code">
        <form onSubmit={handleCodeJoin} className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase());
                setCodeError("");
              }}
              maxLength={6}
              placeholder="E.g. QWM473"
              spellCheck={false}
              className="w-full rounded-xl border border-white/8 bg-recessed py-2.5 pl-10 pr-3.5 font-mono text-sm uppercase tracking-widest text-white outline-none transition-all duration-200 placeholder:normal-case placeholder:tracking-normal placeholder:text-white/25 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl border border-white/8 px-4 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join
          </button>
        </form>
        {codeError && <p className="mt-2 text-xs text-red-400">{codeError}</p>}
      </Section>

      <Section title="Open rooms for this problem">
        {lobby.status === "loading" && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {lobby.status === "error" && (
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-recessed/60 px-4 py-3">
            <CircleAlert className="size-4 shrink-0 text-red-400" />
            <p className="flex-1 text-sm text-white/65">{lobby.message}</p>
            <button
              type="button"
              onClick={lobby.reload}
              className="text-xs font-medium text-primary-start hover:text-primary-end"
            >
              Try again
            </button>
          </div>
        )}

        {lobby.status === "ready" && lobby.rooms.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
            <Users className="mx-auto size-5 text-white/30" />
            <p className="mt-2 text-sm text-white/55">No one is waiting for this problem right now.</p>
            <p className="mt-1 text-xs text-white/35">
              Create a public room above and a partner can join you.
            </p>
          </div>
        )}

        {lobby.status === "ready" && lobby.rooms.length > 0 && (
          <ul className="space-y-2">
            {lobby.rooms.map((room) => (
              <li
                key={room.roomCode}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-recessed/60 px-3.5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-start/15 text-sm font-semibold uppercase text-primary-start">
                    {room.hostUsername[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{room.hostUsername}</p>
                    <p className="text-xs text-white/40">Created {timeAgo(room.createdAt)}</p>
                  </div>
                </div>

                {room.isMine ? (
                  <Link
                    to={`/session/${room.roomCode}`}
                    className="rounded-lg border border-white/8 px-3.5 py-1.5 text-xs font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
                  >
                    Open
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => join(room.roomCode)}
                    disabled={Boolean(joining) || busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-primary-start to-primary-end px-3.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <LogIn className="size-3.5" />
                    {joining === room.roomCode ? "Joining..." : "Join"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {joinError && (
          <p className="mt-3 rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5 text-sm text-red-400">
            {joinError.message}
            {joinError.roomCode && (
              <>
                {" "}
                <Link to={`/session/${joinError.roomCode}`} className="font-medium underline">
                  Go to your room
                </Link>
              </>
            )}
          </p>
        )}
      </Section>
    </div>
  );
};

export default PartnerPractice;