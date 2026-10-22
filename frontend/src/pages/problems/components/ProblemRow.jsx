import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Circle, CircleCheck, CircleDot, ChevronRight } from "lucide-react";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";

// shared with the header row in ProblemsPage so the columns line up
export const ROW_GRID =
  "md:grid-cols-[minmax(0,2.2fr)_100px_150px_minmax(0,1.6fr)_20px]";

const rateColor = (rate) =>
  rate >= 60 ? "bg-emerald-400" : rate >= 40 ? "bg-amber-400" : "bg-red-400";

const Acceptance = ({ rate }) => {
  // no attempts yet, so there is nothing to show
  if (rate === null) return <span className="text-sm text-white/30">-</span>;

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 text-sm tabular-nums text-white/65">{rate}%</span>
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/8">
        <span
          className={`block h-full rounded-full ${rateColor(rate)}`}
          style={{ width: `${rate}%` }}
        />
      </span>
    </div>
  );
};

const progressIcons = {
  solved: { Icon: CircleCheck, className: "text-emerald-400", label: "Solved" },
  attempted: {
    Icon: CircleDot,
    className: "text-amber-400",
    label: "Attempted",
  },
  unsolved: {
    Icon: Circle,
    className: "text-white/20",
    label: "Not attempted",
  },
};

const ProgressIcon = ({ progress }) => {
  const { Icon, className, label } =
    progressIcons[progress] ?? progressIcons.unsolved;
  return <Icon className={`size-5 shrink-0 ${className}`} aria-label={label} />;
};

const ProblemRow = ({ problem, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay: index * 0.03 }}
    className="border-b border-white/8 last:border-b-0"
  >
    <Link
      to={`/problems/${problem.slug}`}
      className={`group grid items-center gap-3 px-5 py-4 transition-colors duration-200 hover:bg-white/3 ${ROW_GRID}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProgressIcon progress={problem.progress} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white transition-colors duration-200 group-hover:text-primary-start">
            {problem.title}
          </p>
          <p className="mt-0.5 truncate text-xs text-white/40">
            {problem.summary}
          </p>
        </div>
      </div>

      {/* on small screens these stack under the title, on md+ they become grid columns */}
      <div className="flex flex-wrap items-center gap-3 md:contents">
        <div>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>

        <Acceptance rate={problem.acceptanceRate} />

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {problem.topics.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/8 bg-recessed px-2.5 py-0.5 text-xs capitalize text-white/60"
            >
              {t}
            </span>
          ))}
          {problem.topics.length > 2 && (
            <span className="px-1 text-xs text-white/35">
              +{problem.topics.length - 2}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="hidden size-4 text-white/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/60 md:block" />
    </Link>
  </motion.div>
);

export const ProblemRowSkeleton = () => (
  <div
    className={`grid animate-pulse items-center gap-3 border-b border-white/8 px-5 py-4 last:border-b-0 ${ROW_GRID}`}
  >
    <div className="space-y-2">
      <div className="h-3.5 w-2/5 rounded bg-white/8" />
      <div className="h-3 w-4/5 rounded bg-white/5" />
    </div>
    <div className="h-5 w-16 rounded-full bg-white/8" />
    <div className="h-3 w-24 rounded bg-white/8" />
    <div className="h-5 w-32 rounded-full bg-white/8" />
    <div className="hidden md:block" />
  </div>
);

export default ProblemRow;
