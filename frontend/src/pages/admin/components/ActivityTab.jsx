import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleAlert, History } from "lucide-react";
import { getActivity } from "../../../api/admin.api.js";
import Pills from "../../../components/Pills.jsx";
import Pagination from "../../../components/Pagination.jsx";

const TARGETS = [
  { value: "", label: "Everything" },
  { value: "problem", label: "Problems" },
  { value: "user", label: "Users" },
];

// what each recorded action reads like, and how its colour is picked
const ACTIONS = {
  "user.role_changed": {
    label: "Changed a role",
    tone: "text-primary-start",
    detail: (d) => (d?.from && d?.to ? `${d.from} to ${d.to}` : ""),
  },
  "problem.created": { label: "Created a problem", tone: "text-primary-start" },
  "problem.updated": { label: "Edited a problem", tone: "text-primary-start" },
  "problem.ai_drafted": {
    label: "Started an AI draft",
    tone: "text-primary-start",
    detail: (d) => (d?.regenerated ? "generated again" : d?.idea ?? ""),
  },
  "problem.published": { label: "Published a problem", tone: "text-emerald-400" },
  "problem.unpublished": { label: "Unpublished a problem", tone: "text-amber-400" },
  "problem.rejected": {
    label: "Rejected a problem",
    tone: "text-red-400",
    detail: (d) => d?.reason ?? "",
  },
  "problem.deleted": { label: "Deleted a problem", tone: "text-red-400" },
  "session.force_ended": { label: "Ended a room", tone: "text-amber-400" },
};

const GRID = "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.6fr)_120px_150px]";

const formatTime = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const RowSkeleton = () => (
  <div className="border-b border-white/8 px-5 py-4 last:border-b-0">
    <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
    <div className="mt-2 h-3 w-32 animate-pulse rounded bg-white/5" />
  </div>
);

const ActivityTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const targetType = searchParams.get("target") || "";
  const page = Math.max(Math.floor(Number(searchParams.get("page"))) || 1, 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 20, 1),
    50,
  );

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });

    // changing the filter or the page size starts again from page 1
    if (!("page" in changes)) next.delete("page");

    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getActivity({ targetType, page, limit });
        if (cancelled) return;
        setItems(res.data.activity);
        setPagination(res.data.pagination);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Could not load the activity log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [targetType, page, limit, reloadKey]);

  return (
    <div>
      <div className="rounded-2xl border border-white/8 bg-card p-3 backdrop-blur-xl">
        <Pills
          options={TARGETS}
          value={targetType}
          onChange={(value) => updateParams({ target: value })}
          layoutId="activity-target-pill"
        />
      </div>

      <p className="mb-3 mt-6">
        <span className="text-2xl font-semibold text-primary-start">
          {pagination.total}
        </span>{" "}
        <span className="text-sm text-white/45">recorded actions</span>
      </p>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl">
        <div
          className={`hidden grid-cols-1 gap-3 border-b border-white/8 px-5 py-3 text-xs font-medium uppercase tracking-wider text-white/35 md:grid ${GRID}`}
        >
          <span>Action</span>
          <span>Target</span>
          <span>Admin</span>
          <span>When</span>
        </div>

        {loading &&
          Array.from({ length: 8 }, (_, i) => <RowSkeleton key={i} />)}

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

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <History className="size-8 text-white/30" />
            <p className="mt-3 text-sm font-medium text-white">
              Nothing has been recorded yet
            </p>
            <p className="mt-1 text-sm text-white/45">
              Role changes and problem actions will show up here.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          items.map((item) => {
            const info = ACTIONS[item.action];
            const detail = info?.detail?.(item.details);

            return (
              <div
                key={item._id}
                className={`grid grid-cols-1 items-center gap-1 border-b border-white/8 px-5 py-3.5 transition-colors duration-200 last:border-b-0 hover:bg-white/3 md:gap-3 ${GRID}`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${info?.tone ?? "text-white"}`}>
                    {info?.label ?? item.action}
                  </p>
                  {detail && (
                    <p className="mt-0.5 truncate text-xs capitalize text-white/40">
                      {detail}
                    </p>
                  )}
                </div>

                <p className="truncate text-sm text-white/75">
                  {item.targetLabel || item.targetId}
                </p>

                <p className="truncate text-sm text-white/55">
                  {item.actorUsername}
                </p>

                <p className="text-sm text-white/45">{formatTime(item.createdAt)}</p>
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
          noun="actions"
          onPageChange={(nextPage) => {
            updateParams({ page: nextPage });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onLimitChange={(value) => updateParams({ limit: value })}
        />
      )}
    </div>
  );
};

export default ActivityTab;