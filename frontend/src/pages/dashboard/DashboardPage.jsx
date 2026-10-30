import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowUp,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDot,
  FileText,
  Flame,
  Plus,
  RefreshCw,
  Terminal,
  User,
  Users,
} from "lucide-react";
import { getDashboard } from "../../api/dashboard.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import DifficultyBadge from "../../components/DifficultyBadge.jsx";
import Spinner from "../../components/Spinner.jsx";

const SCROLL_STYLE = {
  scrollbarWidth: "thin",
  scrollbarColor: "var(--color-primary-start) var(--color-recessed)",
};

const LANGUAGE_NAMES = { python: "Python", typescript: "TypeScript", cpp: "C++" };
const LANGUAGE_BADGES = { python: "PY", typescript: "TS", cpp: "C++" };

const VERDICT_LABELS = {
  accepted: "Accepted",
  wrong_answer: "Wrong answer",
  runtime_error: "Runtime error",
  time_limit_exceeded: "Time limit exceeded",
  compile_error: "Compile error",
};

const formatDate = (iso) => {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
};

const Trend = ({ value }) => (
  <p className="flex items-center gap-1 whitespace-nowrap text-xs text-emerald-400">
    <ArrowUp className="size-3" /> +{value} this month
  </p>
);

// compact horizontal card: icon, number and label on the left, the small extra line on the right
const StatCard = ({ icon: Icon, color, background, value, label, index, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.07 }}
    className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/8 bg-card px-4 py-3 backdrop-blur-xl"
  >
    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${background}`}>
      <Icon className={`size-5 ${color}`} />
    </span>

    <div className="min-w-0">
      <p className="text-2xl font-semibold leading-none tabular-nums text-white">{value}</p>
      <p className="mt-1 text-sm leading-tight text-white/55 sm:truncate">{label}</p>
    </div>

    <div className="ml-auto w-[6.5rem] shrink-0">{children}</div>
  </motion.div>
);

const DIFFICULTIES = [
  { key: "easy", label: "Easy", text: "text-emerald-400", stroke: "var(--color-emerald-400)" },
  { key: "medium", label: "Med.", text: "text-amber-400", stroke: "var(--color-amber-400)" },
  { key: "hard", label: "Hard", text: "text-red-400", stroke: "var(--color-red-400)" },
];

const SIZE = 128;
const CENTER = SIZE / 2;
const RADIUS = 56;
const GAP_DEGREES = 14;

const point = (angle) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [CENTER + RADIUS * Math.cos(rad), CENTER + RADIUS * Math.sin(rad)];
};

const arc = (from, to) => {
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

// one ring split into three arcs sized by how many problems each difficulty has
const SolvedRing = ({ solved, totals, attempting }) => {
  const sum = Math.max(1, totals.easy + totals.medium + totals.hard);
  const available = 360 - GAP_DEGREES * DIFFICULTIES.length;

  let cursor = GAP_DEGREES / 2;

  const segments = DIFFICULTIES.map((d) => {
    // a difficulty with no problems still gets a small arc, so the ring never has a hole
    const span = Math.max(available * (totals[d.key] / sum), 10);
    const from = cursor;
    const to = cursor + span;
    cursor = to + GAP_DEGREES;

    const ratio = totals[d.key] > 0 ? Math.min(1, solved[d.key] / totals[d.key]) : 0;

    return { ...d, from, to, filledTo: from + span * ratio };
  });

  return (
    <div className="flex flex-col items-center gap-3">
    <div className="relative size-40 shrink-0 [@media(max-height:820px)]:size-32 [@media(min-height:960px)]:size-44">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" aria-hidden="true">
        {segments.map((seg) => (
          <g key={seg.key} fill="none" strokeWidth="6" strokeLinecap="round">
            <path d={arc(seg.from, seg.to)} stroke={seg.stroke} strokeOpacity="0.18" />
            {seg.filledTo > seg.from && (
              <motion.path
                d={arc(seg.from, seg.filledTo)}
                stroke={seg.stroke}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="leading-none text-white">
          <span className="text-3xl font-semibold tabular-nums sm:text-4xl">{solved.total}</span>
          <span className="text-base text-white/45">/{totals.total}</span>
        </p>
        <p className="mt-2 flex items-center gap-1 text-sm text-white/70">
          <CircleCheck className="size-4 text-emerald-400" /> Solved
        </p>
      </div>
    </div>

    <p className="text-xs text-white/45">
      <span className="font-semibold text-white/70">{attempting}</span> Attempting
    </p>
    </div>
  );
};

const SolvedCard = ({ solved, totals, attempting }) => (
  <Card title="Progress" className="lg:min-h-0 lg:flex-1">
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 pb-5">
      <SolvedRing solved={solved} totals={totals} attempting={attempting} />

      <div className="grid w-full grid-cols-3 gap-2.5">
        {DIFFICULTIES.map((d) => (
          <div key={d.key} className="rounded-xl border border-white/8 bg-recessed px-2 py-1.5 text-center">
            <p className={`text-xs font-medium ${d.text}`}>{d.label}</p>
            <p className="text-sm font-semibold tabular-nums text-white">
              {solved[d.key]}/{totals[d.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

const Card = ({ title, className = "", children }) => (
  <section
    className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl ${className}`}
  >
    <h2 className="shrink-0 px-5 pb-3 pt-4 text-base font-semibold text-white">{title}</h2>
    {children}
  </section>
);

const EmptyState = ({ icon: Icon, text }) => (
  <div className="flex flex-1 flex-col items-center justify-center px-4 pb-6 text-center">
    <Icon className="size-6 text-white/20" />
    <p className="mt-2 text-sm text-white/45">{text}</p>
  </div>
);

const BarRow = ({ left, label, count, max, index, height }) => (
  <div className={`flex items-center gap-3 ${height}`}>
    {left}
    <span className="w-24 shrink-0 truncate text-sm capitalize text-white/80 lg:w-20 xl:w-24">{label}</span>

    <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: `${(count / max) * 100}%` }}
        transition={{ duration: 0.6, delay: index * 0.06 }}
        className="block h-full rounded-full bg-linear-to-r from-primary-start to-primary-end"
      />
    </span>

    <span className="w-7 shrink-0 text-right text-sm tabular-nums text-white/55">{count}</span>
  </div>
);

const LanguagesCard = ({ languages }) => {
  const max = Math.max(1, ...languages.map((l) => l.count));

  return (
    <Card title="Languages" className="h-60 lg:h-auto">
      {languages.length === 0 ? (
        <EmptyState icon={Terminal} text="No submissions yet" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5" style={SCROLL_STYLE}>
          {languages.map((item, index) => (
            <BarRow
              key={item.language}
              index={index}
              max={max}
              count={item.count}
              height="h-10"
              label={LANGUAGE_NAMES[item.language] ?? item.language}
              left={
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-primary-start/25 bg-primary-start/15 text-[10px] font-bold text-primary-start">
                  {LANGUAGE_BADGES[item.language] ?? item.language.slice(0, 2).toUpperCase()}
                </span>
              }
            />
          ))}
        </div>
      )}
    </Card>
  );
};

const TopicsCard = ({ topics }) => {
  const max = Math.max(1, ...topics.map((t) => t.count));

  return (
    <Card title="Topics" className="h-60 lg:h-auto">
      {topics.length === 0 ? (
        <EmptyState icon={FileText} text="No topics practiced yet" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5" style={SCROLL_STYLE}>
          {topics.map((item, index) => (
            <BarRow
              key={item.topic}
              index={index}
              max={max}
              count={item.count}
              height="h-[1.875rem]"
              label={item.topic}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

const STATUS = {
  solved: { Icon: CircleCheck, className: "text-emerald-400", label: "Solved" },
  attempted: { Icon: CircleDot, className: "text-amber-400", label: "Attempted" },
};

const COLUMNS = "grid grid-cols-[minmax(0,2fr)_90px_minmax(0,1.2fr)_110px_120px_70px] items-center gap-3 px-5";

const RecentPractice = ({ submissions }) => (
  <Card title="Recent Practice" className="h-[30rem] lg:h-auto lg:min-h-0 lg:flex-[1.45]">
    {submissions.length === 0 ? (
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 text-center">
        <Terminal className="size-8 text-white/20" />
        <p className="mt-3 text-sm font-medium text-white/70">No practice activity yet</p>
        <p className="mt-1 text-xs text-white/40">Your latest submissions will appear here.</p>
        <Link
          to="/problems"
          className="mt-5 rounded-xl bg-linear-to-r from-primary-start to-primary-end px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5"
        >
          Explore problems
        </Link>
      </div>
    ) : (
      <div className="min-h-0 flex-1 overflow-auto border-t border-white/8" style={SCROLL_STYLE}>
        <div className="min-w-[680px]">
          <div
            className={`sticky top-0 z-10 border-b border-white/8 bg-recessed py-2.5 text-xs font-medium uppercase tracking-wider text-white/35 ${COLUMNS}`}
          >
            <span>Problem</span>
            <span>Difficulty</span>
            <span>Topic</span>
            <span>Mode</span>
            <span>Status</span>
            <span>Date</span>
          </div>

          {submissions.map((s) => {
            const status = STATUS[s.verdict === "accepted" ? "solved" : "attempted"];
            const ModeIcon = s.mode === "Interview" ? Users : User;

            return (
              <Link
                key={s._id}
                to={`/problems/${s.problem.slug}`}
                className={`group h-11 border-b border-white/8 text-sm transition-colors duration-200 last:border-b-0 hover:bg-white/3 ${COLUMNS}`}
              >
                <span className="truncate font-medium text-white transition-colors duration-200 group-hover:text-primary-start">
                  {s.problem.title}
                </span>

                <span>
                  <DifficultyBadge difficulty={s.problem.difficulty} />
                </span>

                <span className="min-w-0">
                  <span className="inline-block max-w-full truncate rounded-full border border-white/8 bg-recessed px-2.5 py-0.5 align-middle text-xs capitalize text-white/60">
                    {s.problem.topic}
                  </span>
                </span>

                <span className="flex items-center gap-1.5 text-white/60">
                  <ModeIcon className="size-3.5" /> {s.mode}
                </span>

                <span
                  title={VERDICT_LABELS[s.verdict] ?? s.verdict}
                  className={`flex items-center gap-1.5 whitespace-nowrap ${status.className}`}
                >
                  <status.Icon className="size-4 shrink-0" /> {status.label}
                </span>

                <span className="flex items-center justify-between whitespace-nowrap text-white/45">
                  {formatDate(s.createdAt)}
                  <ChevronRight className="size-4 text-white/25 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/60" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    )}
  </Card>
);

const DashboardPage = () => {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    getDashboard()
      .then((res) => {
        if (cancelled) return;
        setDashboard(res.data.dashboard);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || "Could not load your dashboard.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-4 text-center">
        <CircleAlert className="size-9 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mt-2 max-w-md text-sm text-white/50">{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
        >
          <RefreshCw className="size-4" /> Try again
        </button>
      </div>
    );
  }

  const { stats, languages, topics, recentPractice } = dashboard;

  const cards = [
    {
      icon: Users,
      color: "text-primary-start",
      background: "bg-primary-start/10",
      value: stats.sessions,
      label: "Sessions Completed",
      extra: <Trend value={stats.sessionsThisMonth} />,
    },
    {
      icon: Flame,
      color: "text-amber-400",
      background: "bg-amber-400/10",
      value: stats.streak,
      label: "Day Streak",
      extra: (
        <p className="flex items-center gap-1 whitespace-nowrap text-xs text-white/45">
          <ArrowUp className="size-3 text-amber-400" /> Best: {stats.bestStreak}{" "}
          {stats.bestStreak === 1 ? "day" : "days"}
        </p>
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10 lg:h-[calc(100dvh-4.0625rem)] lg:min-h-[38rem] lg:pb-6 lg:pt-8">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">Dashboard</p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Welcome back,{" "}
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              {user?.username}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/45 sm:text-base lg:[@media(max-height:900px)]:hidden">
            Your interview preparation at a glance.
          </p>
        </div>

        <Link
          to="/problems"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
        >
          <Plus className="size-4" /> Practice Problem
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 lg:min-h-0">
          <SolvedCard solved={stats.solved} totals={stats.totals} attempting={stats.attempting} />

          {cards.map((c, i) => (
            <StatCard key={c.label} index={i + 1} {...c}>
              {c.extra}
            </StatCard>
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:min-h-0">
          <RecentPractice submissions={recentPractice} />

          <div className="grid gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]">
            <LanguagesCard languages={languages} />
            <TopicsCard topics={topics} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;