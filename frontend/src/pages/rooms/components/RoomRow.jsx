import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";
import { timeAgo } from "../../../lib/timeAgo.js";

const STATUS = {
  waiting: {
    label: "Waiting",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  },
  active: {
    label: "In progress",
    className: "border-sky-400/30 bg-sky-400/10 text-sky-400",
  },
};

const RoomRow = ({ room, index, onJoin, joining, disabled }) => {
  const status = STATUS[room.status];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-start/15 text-base font-semibold uppercase text-primary-start">
          {room.hostUsername[0]}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{room.problem.title}</p>
          <p className="mt-0.5 truncate text-xs text-white/40">
            hosted by {room.hostUsername} · {room.participantCount}/2 in room · {timeAgo(room.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <DifficultyBadge difficulty={room.problem.difficulty} />

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>

        <span className="font-mono text-xs tracking-wider text-white/45">{room.roomCode}</span>

        {room.isMine ? (
          <Link
            to={`/session/${room.roomCode}`}
            className="rounded-lg border border-white/8 px-4 py-2 text-xs font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
          >
            Open
          </Link>
        ) : room.status === "waiting" ? (
          <button
            type="button"
            onClick={() => onJoin(room.roomCode)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-primary-start to-primary-end px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <LogIn className="size-3.5" />
            {joining ? "Joining..." : "Join room"}
          </button>
        ) : (
          <span className="rounded-lg border border-white/8 bg-recessed px-4 py-2 text-xs font-medium text-white/40">
            Full
          </span>
        )}
      </div>
    </motion.li>
  );
};

export const RoomRowSkeleton = () => (
  <li className="flex animate-pulse items-center justify-between gap-4 border-b border-white/8 px-5 py-4 last:border-b-0">
    <div className="flex items-center gap-3.5">
      <span className="size-11 rounded-full bg-white/8" />
      <div className="space-y-2">
        <div className="h-3.5 w-40 rounded bg-white/8" />
        <div className="h-3 w-56 rounded bg-white/5" />
      </div>
    </div>
    <div className="h-8 w-24 rounded-lg bg-white/8" />
  </li>
);

export default RoomRow;