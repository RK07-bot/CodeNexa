import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  SearchX,
  CircleAlert,
  CircleCheck,
  ChevronDown,
  ListChecks,
  Globe,
  EyeOff,
  Trash2,
  Plus,
  Pencil,
} from "lucide-react";
import {
  getAdminProblems,
  getAdminTopics,
  setProblemStatus,
  deleteProblem,
} from "../../../api/admin.api.js";
import useDebounce from "../../../hooks/useDebounce.js";
import Pills from "../../../components/Pills.jsx";
import Pagination from "../../../components/Pagination.jsx";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import ValidationDialog from "./ValidationDialog.jsx";

const STATUS = {
  approved: {
    label: "Published",
    style: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  },
  draft: {
    label: "Draft",
    style: "border-white/10 bg-white/5 text-white/55",
  },
  pending_review: {
    label: "Pending review",
    style: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  },
  processing: {
    label: "Processing",
    style: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  },
  rejected: {
    label: "Rejected",
    style: "border-red-400/30 bg-red-400/10 text-red-400",
  },
};

const STATUS_ORDER = ["approved", "draft", "pending_review", "processing", "rejected"];

const difficulties = [
  { value: "", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const inputStyles =
  "w-full rounded-xl border border-white/8 bg-recessed text-sm text-white outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10";

const PROBLEM_GRID =
  "md:grid-cols-[minmax(0,2.2fr)_90px_130px_90px_110px_minmax(0,1.6fr)]";

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const nameOf = (problem) => problem.title || "Untitled draft";

// what each confirmable action says and does
const ACTIONS = {
  publish: {
    title: "Publish this problem?",
    message: (p) =>
      `"${nameOf(p)}" becomes visible to everyone and can be solved straight away.`,
    confirmLabel: "Publish",
    danger: false,
    run: (p) => setProblemStatus(p._id, "approved"),
  },
  unpublish: {
    title: "Unpublish this problem?",
    message: (p) =>
      `"${nameOf(p)}" disappears from the problem set and from users' dashboards until it is published again. Existing submissions are kept.`,
    confirmLabel: "Unpublish",
    danger: true,
    run: (p) => setProblemStatus(p._id, "draft"),
  },
  delete: {
    title: "Delete this problem?",
    message: (p) =>
      `"${nameOf(p)}" will be removed for good, including its hidden tests and reference solution. This cannot be undone.`,
    confirmLabel: "Delete",
    danger: true,
    run: (p) => deleteProblem(p._id),
  },
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS[status]?.style}`}
  >
    {STATUS[status]?.label ?? status}
  </span>
);

const ProblemRowSkeleton = () => (
  <div className="border-b border-white/8 px-5 py-4 last:border-b-0">
    <div className="h-4 w-52 animate-pulse rounded bg-white/5" />
    <div className="mt-2 h-3 w-36 animate-pulse rounded bg-white/5" />
  </div>
);

const actionBase =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40";
const actionNeutral = `${actionBase} border-white/8 text-white/75 hover:border-white/15 hover:text-white`;
const actionDanger = `${actionBase} border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/15`;

const ProblemsTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const topic = searchParams.get("topic") || "";
  const page = Math.max(Math.floor(Number(searchParams.get("page"))) || 1, 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 10, 1),
    50,
  );

  // the input keeps what the admin is typing, the URL only gets the settled value
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput);

  const [problems, setProblems] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // the problem being validated, and the action waiting for confirmation
  const [validating, setValidating] = useState(null);
  const [pending, setPending] = useState(null); // { type, problem }
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  // the form page sends a "saved" message along when it comes back here
  const [notice, setNotice] = useState(location.state?.notice ?? "");

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
    // if this fails the dropdown just stays on "All topics"
    getAdminTopics()
      .then((res) => setTopics(res.data.topics))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getAdminProblems({
          search,
          status,
          difficulty,
          topic,
          page,
          limit,
        });
        if (cancelled) return;
        setProblems(res.data.problems);
        setStatusCounts(res.data.statusCounts);
        setPagination(res.data.pagination);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Could not load problems.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // a newer request has started, ignore this one's result
    return () => {
      cancelled = true;
    };
  }, [search, status, difficulty, topic, page, limit, reloadKey]);

  // clear the message from the history entry, so a refresh does not show it again
  useEffect(() => {
    if (location.state?.notice) {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
    // only needs to run once, when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the success message disappears by itself
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const hasFilters = Boolean(search || status || difficulty || topic);

  const clearFilters = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  };

  const totalProblems = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  // "Processing" only shows up when something is actually processing
  const statusOptions = [
    { value: "", label: `All (${totalProblems})` },
    ...STATUS_ORDER.filter(
      (s) => s !== "processing" || statusCounts.processing > 0 || status === s,
    ).map((s) => ({
      value: s,
      label: `${STATUS[s].label} (${statusCounts[s] ?? 0})`,
    })),
  ];

  const openAction = (type, problem) => {
    setDialogError("");
    setPending({ type, problem });
  };

  const closeAction = () => {
    if (!saving) setPending(null);
  };

  const confirmAction = async () => {
    setSaving(true);
    setDialogError("");

    try {
      const res = await ACTIONS[pending.type].run(pending.problem);
      setNotice(res.data.message);
      setPending(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      // the server explains why (not validated, has submissions, ...)
      setDialogError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // a validation run may have recorded a result, so the list is refreshed on close
  const closeValidation = () => {
    setValidating(null);
    setReloadKey((k) => k + 1);
  };

  const action = pending ? ACTIONS[pending.type] : null;

  return (
    <div>
      <div className="space-y-3 rounded-2xl border border-white/8 bg-card p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title or slug"
              className={`${inputStyles} py-2.5 pl-10 pr-3.5 placeholder:text-white/25`}
            />
          </div>

          <Pills
            options={difficulties}
            value={difficulty}
            onChange={(value) => updateParams({ difficulty: value })}
            layoutId="problems-difficulty-pill"
          />

          <div className="relative lg:w-48">
            <select
              value={topic}
              onChange={(e) => updateParams({ topic: e.target.value })}
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
          <Pills
            options={statusOptions}
            value={status}
            onChange={(value) => updateParams({ status: value })}
            layoutId="problems-status-pill"
          />
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-400"
        >
          <CircleCheck className="size-4 shrink-0" />
          {notice}
        </p>
      )}

      <div className="mb-3 mt-6 flex items-center justify-between gap-4">
        <p>
          <span className="text-2xl font-semibold text-primary-start">
            {pagination.total}
          </span>{" "}
          <span className="text-sm text-white/45">problems</span>
        </p>

        <Link
          to="/admin/problems/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5"
        >
          <Plus className="size-4" /> Add problem
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl">
        <div
          className={`hidden grid-cols-1 gap-3 border-b border-white/8 px-5 py-3 text-xs font-medium uppercase tracking-wider text-white/35 md:grid ${PROBLEM_GRID}`}
        >
          <span>Problem</span>
          <span>Difficulty</span>
          <span>Status</span>
          <span>Acceptance</span>
          <span>Created</span>
          <span />
        </div>

        {loading &&
          Array.from({ length: Math.min(limit, 8) }, (_, i) => (
            <ProblemRowSkeleton key={i} />
          ))}

        {!loading && error && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
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
        )}

        {!loading && !error && problems.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <SearchX className="size-8 text-white/30" />
            <p className="mt-3 text-sm font-medium text-white">
              {hasFilters ? "No problems match your filters" : "No problems yet"}
            </p>
            {hasFilters && (
              <>
                <p className="mt-1 text-sm text-white/45">
                  Try a different search or remove a filter.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-lg border border-white/8 px-4 py-2 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          problems.map((problem) => {
            const canPublish = ["draft", "pending_review", "rejected"].includes(
              problem.status,
            );
            const canDelete = canPublish;
            const canValidate = problem.status !== "processing";

            return (
              <div
                key={problem._id}
                className={`grid grid-cols-1 items-center gap-3 border-b border-white/8 px-5 py-4 transition-colors duration-200 last:border-b-0 hover:bg-white/3 ${PROBLEM_GRID}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {nameOf(problem)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-white/35">
                    {problem.slug || "no slug yet"}
                    {problem.createdBy ? ` · by ${problem.createdBy}` : ""}
                  </p>

                  {problem.topics?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {problem.topics.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] capitalize text-white/45"
                        >
                          {t}
                        </span>
                      ))}
                      {problem.topics.length > 3 && (
                        <span className="px-1 py-0.5 text-[11px] text-white/35">
                          +{problem.topics.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  {problem.difficulty ? (
                    <DifficultyBadge difficulty={problem.difficulty} />
                  ) : (
                    <span className="text-sm text-white/30">-</span>
                  )}
                </div>

                <div className="space-y-1">
                  <StatusBadge status={problem.status} />
                  <p
                    className={`text-[11px] ${
                      problem.validatedAt ? "text-emerald-400/80" : "text-white/35"
                    }`}
                  >
                    {problem.validatedAt
                      ? `Validated ${formatDate(problem.validatedAt)}`
                      : "Not validated"}
                  </p>
                </div>

                <span className="text-sm text-white/55">
                  {problem.acceptanceRate === null
                    ? "-"
                    : `${problem.acceptanceRate}%`}
                </span>

                <span className="text-sm text-white/55">
                  {formatDate(problem.createdAt)}
                </span>

                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {canValidate && (
                    <button
                      type="button"
                      onClick={() => setValidating(problem)}
                      className={actionNeutral}
                    >
                      <ListChecks className="size-3.5" />
                      Validate
                    </button>
                  )}

                  {canPublish && (
                    <Link
                      to={`/admin/problems/${problem._id}/edit`}
                      className={actionNeutral}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Link>
                  )}

                  {canPublish && (
                    <button
                      type="button"
                      disabled={!problem.validatedAt}
                      title={
                        problem.validatedAt
                          ? undefined
                          : "Validate the problem before publishing"
                      }
                      onClick={() => openAction("publish", problem)}
                      className={actionNeutral}
                    >
                      <Globe className="size-3.5" />
                      Publish
                    </button>
                  )}

                  {problem.status === "approved" && (
                    <button
                      type="button"
                      onClick={() => openAction("unpublish", problem)}
                      className={actionDanger}
                    >
                      <EyeOff className="size-3.5" />
                      Unpublish
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      aria-label={`Delete ${nameOf(problem)}`}
                      title="Delete"
                      onClick={() => openAction("delete", problem)}
                      className={`${actionDanger} px-2`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {!loading && !error && pagination.total > 0 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          noun="problems"
          onPageChange={(nextPage) => {
            updateParams({ page: nextPage });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onLimitChange={(value) => updateParams({ limit: value })}
        />
      )}

      {validating && (
        <ValidationDialog
          key={validating._id}
          problem={validating}
          onClose={closeValidation}
        />
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        danger={action?.danger}
        busy={saving}
        error={dialogError}
        title={action?.title ?? ""}
        message={action ? action.message(pending.problem) : ""}
        confirmLabel={action?.confirmLabel}
        onConfirm={confirmAction}
        onCancel={closeAction}
      />
    </div>
  );
};

export default ProblemsTab;