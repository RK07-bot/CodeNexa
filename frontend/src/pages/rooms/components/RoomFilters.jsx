import { ChevronDown, Search } from "lucide-react";
import Pills from "../../../components/Pills.jsx";

const statuses = [
  { value: "", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "active", label: "In progress" },
];

const inputStyles =
  "w-full rounded-xl border border-white/8 bg-recessed text-sm text-white outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10";

const RoomFilters = ({
  searchInput,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  status,
  onStatusChange,
  total,
}) => (
  <div className="space-y-3 rounded-2xl border border-white/8 bg-card p-3 backdrop-blur-xl">
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by problem or host"
          className={`${inputStyles} py-2.5 pl-10 pr-3.5 placeholder:text-white/25`}
        />
      </div>

      <div className="relative sm:w-44">
        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          className={`${inputStyles} appearance-none py-2.5 pl-3.5 pr-9 [&>option]:bg-background`}
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
      <Pills options={statuses} value={status} onChange={onStatusChange} layoutId="room-status-pill" />
      <p className="text-sm text-white/45">
        {total} {total === 1 ? "room" : "rooms"}
      </p>
    </div>
  </div>
);

export default RoomFilters;