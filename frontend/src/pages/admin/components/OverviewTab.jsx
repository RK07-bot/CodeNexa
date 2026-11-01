import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  FileCode2,
  Send,
  Radio,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
} from "lucide-react";
import { getOverview } from "../../../api/admin.api.js";

const VERDICTS = {
  accepted: { label: "Accepted", bar: "bg-emerald-400" },
  wrong_answer: { label: "Wrong answer", bar: "bg-red-400" },
  runtime_error: { label: "Runtime error", bar: "bg-red-400/60" },
  time_limit_exceeded: { label: "Time limit", bar: "bg-amber-400" },
  compile_error: { label: "Compile error", bar: "bg-amber-400/60" },
};

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="rounded-2xl border border-white/8 bg-card p-5 backdrop-blur-xl">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wider text-white/35">
        {label}
      </p>
      <span className="grid size-9 place-items-center rounded-xl bg-primary-start/10 text-primary-start">
        <Icon className="size-[18px]" />
      </span>
    </div>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
      {value}
    </p>
    <p className="mt-1 text-sm text-white/45">{sub}</p>
  </div>
);

const Panel = ({ title, aside, children, className = "" }) => (
  <div
    className={`rounded-2xl border border-white/8 bg-card p-5 backdrop-blur-xl ${className}`}
  >
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {aside && <span className="text-xs text-white/35">{aside}</span>}
    </div>
    <div className="mt-4">{children}</div>
  </div>
);

// one labelled horizontal bar, used for verdicts and languages
const BarRow = ({ label, count, percent, barClass }) => (
  <div>
    <div className="flex items-center justify-between text-sm">
      <span className="capitalize text-white/75">{label}</span>
      <span className="text-white/45">
        {count} · {percent}%
      </span>
    </div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
      <div
        className={`h-full rounded-full ${barClass}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

const percentOf = (count, total) =>
  total > 0 ? Math.round((count / total) * 100) : 0;

// "2026-10-31" -> "Oct 31"
const dayTitle = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const OverviewSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-2xl border border-white/8 bg-card"
        />
      ))}
    </div>
    <div className="h-64 animate-pulse rounded-2xl border border-white/8 bg-card" />
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-48 animate-pulse rounded-2xl border border-white/8 bg-card" />
      <div className="h-48 animate-pulse rounded-2xl border border-white/8 bg-card" />
    </div>
  </div>
);

const OverviewTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getOverview();
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Could not load the overview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) return <OverviewSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-white/8 bg-card px-6 py-14 text-center backdrop-blur-xl">
        <CircleAlert className="size-8 text-red-400" />
        <p className="mt-3 text-sm text-white/65">{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const { users, problems, submissions, sessions, attention } = data;
  const { approved } = problems;

  const maxDay = Math.max(1, ...submissions.perDay.map((d) => d.total));
  const windowTotal = submissions.perDay.reduce((sum, d) => sum + d.total, 0);
  const languageTotal = submissions.languages.reduce(
    (sum, l) => sum + l.count,
    0,
  );

  const needsAttention = attention.pendingReview > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Users"
          value={users.total}
          sub={`${users.newThisWeek} new this week`}
        />
        <StatCard
          icon={FileCode2}
          label="Approved problems"
          value={approved.total}
          sub={`${approved.easy} easy · ${approved.medium} medium · ${approved.hard} hard`}
        />
        <StatCard
          icon={Send}
          label="Submissions today"
          value={submissions.today}
          sub={
            submissions.acceptanceToday === null
              ? "No submissions yet"
              : `${submissions.acceptanceToday}% accepted`
          }
        />
        <StatCard
          icon={Radio}
          label="Rooms live now"
          value={sessions.live}
          sub={`${sessions.completedThisWeek} completed this week`}
        />
      </div>

      <Panel
        title="Needs attention"
        aside={needsAttention ? undefined : "All clear"}
      >
        {!needsAttention && (
          <p className="flex items-center gap-2 text-sm text-white/55">
            <CircleCheck className="size-4 text-emerald-400" />
            Nothing is waiting for you.
          </p>
        )}

        <div className="space-y-3">
          {attention.pendingReview > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-amber-400">
                <ClipboardCheck className="size-4 shrink-0" />
                {attention.pendingReview}{" "}
                {attention.pendingReview === 1 ? "problem is" : "problems are"}{" "}
                waiting for review
              </p>
              <Link
                to="/admin/problems?status=pending_review"
                className="text-sm font-medium text-amber-400 hover:underline"
              >
                Review them
              </Link>
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="Submissions per day"
        aside={`Last 14 days · ${windowTotal} total`}
      >
        <div className="flex h-40 items-end gap-1.5 sm:gap-2">
          {submissions.perDay.map((day) => (
            <div
              key={day.date}
              title={`${dayTitle(day.date)}: ${day.total} submissions, ${day.accepted} accepted`}
              className="flex h-full flex-1 items-end"
            >
              <div
                className={`w-full rounded-t-md ${
                  day.total > 0
                    ? "bg-linear-to-t from-primary-start to-primary-end"
                    : "bg-white/8"
                }`}
                style={{
                  height:
                    day.total > 0
                      ? `${Math.max((day.total / maxDay) * 100, 4)}%`
                      : "2px",
                }}
              />
            </div>
          ))}
        </div>

        <div className="mt-2 flex gap-1.5 sm:gap-2">
          {submissions.perDay.map((day) => (
            <span
              key={day.date}
              className="flex-1 text-center text-[11px] text-white/35"
            >
              {Number(day.date.slice(8))}
            </span>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Verdicts" aside="Last 14 days">
          {submissions.verdicts.length === 0 ? (
            <p className="text-sm text-white/45">No submissions yet.</p>
          ) : (
            <div className="space-y-3.5">
              {submissions.verdicts.map(({ verdict, count }) => (
                <BarRow
                  key={verdict}
                  label={VERDICTS[verdict]?.label ?? verdict}
                  count={count}
                  percent={percentOf(count, windowTotal)}
                  barClass={VERDICTS[verdict]?.bar ?? "bg-white/30"}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Languages" aside="Last 14 days">
          {submissions.languages.length === 0 ? (
            <p className="text-sm text-white/45">No submissions yet.</p>
          ) : (
            <div className="space-y-3.5">
              {submissions.languages.map(({ language, count }) => (
                <BarRow
                  key={language}
                  label={language}
                  count={count}
                  percent={percentOf(count, languageTotal)}
                  barClass="bg-linear-to-r from-primary-start to-primary-end"
                />
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default OverviewTab;