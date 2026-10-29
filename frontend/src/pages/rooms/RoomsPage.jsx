import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleAlert, Radio, SearchX, Users } from "lucide-react";
import { getMyOpenSession } from "../../api/sessions.api.js";
import { useSocket } from "../../context/SocketContext.jsx";
import useDebounce from "../../hooks/useDebounce.js";
import useLobby from "../../hooks/useLobby.js";
import useJoinRoom from "../../hooks/useJoinRoom.js";
import Pagination from "../../components/Pagination.jsx";
import JoinByCode from "./components/JoinByCode.jsx";
import RoomFilters from "./components/RoomFilters.jsx";
import RoomRow, { RoomRowSkeleton } from "./components/RoomRow.jsx";

const STATUSES = ["waiting", "active"];
const DIFFICULTIES = ["easy", "medium", "hard"];

// a hand-edited URL with a bad value just means no filter, not an error page
const pick = (value, allowed) => (allowed.includes(value) ? value : "");

const RoomsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { connected } = useSocket();

  const search = searchParams.get("search") || "";
  const status = pick(searchParams.get("status"), STATUSES);
  const difficulty = pick(searchParams.get("difficulty"), DIFFICULTIES);
  const page = Math.max(Math.floor(Number(searchParams.get("page"))) || 1, 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 50);

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput);
  const [myRoom, setMyRoom] = useState(null);
  const [, setTick] = useState(0);

  const lobby = useLobby({ search, status, difficulty, page, limit });
  const { join, joining, error: joinError } = useJoinRoom();

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

    // changing a filter or the page size always starts again from page 1
    if (!("page" in changes)) next.delete("page");

    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch.trim() !== search) {
      updateParams({ search: debouncedSearch.trim() });
    }
    // runs when the typed text settles, everything else is read fresh each time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

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

  // the "5 minutes ago" text is only recalculated on render, so this keeps it fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // rooms disappear while the page is open, so a later page can end up empty
  useEffect(() => {
    if (lobby.status === "ready" && page > 1 && page > lobby.pagination.totalPages) {
      updateParams({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby.status, lobby.pagination.totalPages, page]);

  const hasFilters = Boolean(search || status || difficulty);
  const busy = Boolean(myRoom);

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  };

  const changePage = (nextPage) => {
    updateParams({ page: nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
            Pair programming
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Find a{" "}
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              room
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/45 sm:text-base">
            Join another developer and practice a coding problem together in real time.
          </p>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-start/10 text-primary-start">
            <Users className="size-6" />
          </span>
          <p className="text-sm leading-5 text-white/45">
            Code together.
            <br />
            Learn together.
            <br />
            Grow together.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <JoinByCode />
      </div>

      {myRoom?.roomCode && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3">
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

      <div className="mt-6">
        <RoomFilters
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          difficulty={difficulty}
          onDifficultyChange={(value) => updateParams({ difficulty: value })}
          status={status}
          onStatusChange={(value) => updateParams({ status: value })}
          total={lobby.pagination.total}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
          <div className="flex items-start gap-3">
            <Radio className="mt-0.5 size-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Live public rooms</h2>
              <p className="mt-0.5 text-sm text-white/45">
                Join an open room and solve a problem together.
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-white/45">
            <span
              className={`size-1.5 rounded-full ${connected ? "animate-pulse bg-emerald-400" : "bg-white/30"}`}
            />
            {connected ? "Live" : "Reconnecting..."}
          </span>
        </div>

        {joinError && (
          <p className="border-b border-white/8 bg-red-500/5 px-5 py-3 text-sm text-red-400">
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

        {lobby.status === "loading" && (
          <ul>
            {[0, 1, 2, 3].map((i) => (
              <RoomRowSkeleton key={i} />
            ))}
          </ul>
        )}

        {lobby.status === "error" && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <CircleAlert className="size-8 text-red-400" />
            <p className="mt-3 text-sm text-white/65">{lobby.message}</p>
            <button
              type="button"
              onClick={lobby.reload}
              className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        {lobby.status === "ready" && lobby.rooms.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <SearchX className="size-8 text-white/30" />
            <p className="mt-3 text-sm font-medium text-white">
              {hasFilters ? "No rooms match your filters" : "No open rooms right now"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-white/45">
              {hasFilters
                ? "Try a different search or remove a filter."
                : "Pick a problem and create a public room, or share a private code with a friend."}
            </p>

            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
              >
                Clear filters
              </button>
            ) : (
              <Link
                to="/problems"
                className="mt-4 rounded-lg bg-linear-to-r from-primary-start to-primary-end px-4 py-2 text-sm font-semibold text-white"
              >
                Browse problems
              </Link>
            )}
          </div>
        )}

        {lobby.status === "ready" && lobby.rooms.length > 0 && (
          <ul>
            {lobby.rooms.map((room, i) => (
              <RoomRow
                key={room.roomCode}
                room={room}
                index={i}
                onJoin={join}
                joining={joining === room.roomCode}
                disabled={Boolean(joining) || busy}
              />
            ))}
          </ul>
        )}
      </div>

      {lobby.status === "ready" && lobby.pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={lobby.pagination.totalPages}
          total={lobby.pagination.total}
          limit={limit}
          onPageChange={changePage}
          onLimitChange={(value) => updateParams({ limit: value })}
          noun="rooms"
        />
      )}
    </div>
  );
};

export default RoomsPage;