import { motion } from "framer-motion";
import { Search, ChevronDown } from "lucide-react";

const difficulties = [
  { value: "", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const progressOptions = [
  { value: "", label: "All" },
  { value: "solved", label: "Solved" },
  { value: "attempted", label: "Attempted" },
  { value: "unsolved", label: "Unsolved" },
];

const inputStyles =
  "w-full rounded-xl border border-white/8 bg-recessed text-sm text-white outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10";

const Pills = ({ options, value, onChange, layoutId }) => (
  <div className="flex flex-wrap items-center gap-2">
    {options.map((o) => {
      const active = value === o.value;

      return (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative rounded-full border border-white/8 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            active ? "text-white" : "text-white/55 hover:text-white"
          }`}
        >
          {active && (
            // one shared highlight that slides between pills
            <motion.span
              layoutId={layoutId}
              className="absolute -inset-px rounded-full bg-linear-to-r from-primary-start to-primary-end"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      );
    })}
  </div>
);

const ProblemFilters = ({
  searchInput,
  onSearchChange,
  difficulty,
  onDifficultyChange,
  topic,
  onTopicChange,
  topics,
  progress,
  onProgressChange,
}) => (
  <div className="space-y-3 rounded-2xl border border-white/8 bg-card p-3 backdrop-blur-xl">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or topic"
          className={`${inputStyles} py-2.5 pl-10 pr-3.5 placeholder:text-white/25`}
        />
      </div>

      <Pills options={difficulties} value={difficulty} onChange={onDifficultyChange} layoutId="difficulty-pill" />

      <div className="relative lg:w-48">
        <select
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          className={`${inputStyles} appearance-none py-2.5 pl-3.5 pr-9 capitalize [&>option]:bg-background`}
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
      </div>
    </div>

    <div className="border-t border-white/8 pt-3">
      <Pills options={progressOptions} value={progress} onChange={onProgressChange} layoutId="progress-pill" />
    </div>
  </div>
);

export default ProblemFilters;