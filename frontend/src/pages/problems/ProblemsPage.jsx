import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Code2, SearchX, CircleAlert } from "lucide-react";
import { getProblems, getTopics } from "../../api/problems.api.js";
import useDebounce from "../../hooks/useDebounce.js";
import ProblemFilters from "./components/ProblemFilters.jsx";
import ProblemRow, {
  ProblemRowSkeleton,
  ROW_GRID,
} from "./components/ProblemRow.jsx";
import Pagination from "../../components/Pagination.jsx";

const ProblemsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const progress = searchParams.get("progress") || "";
  const search = searchParams.get("search") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const topic = searchParams.get("topic") || "";
  const page = Math.max(Math.floor(Number(searchParams.get("page"))) || 1, 1);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 10, 1),
    50,
  );

  // the input keeps what the user is typing, the URL only gets the settled value
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput);

  const [problems, setProblems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
    // if this fails the dropdown just stays on "All topics", not worth an error screen
    getTopics()
      .then((res) => setTopics(res.data.topics))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await getProblems({
          search,
          difficulty,
          topic,
          progress,
          page,
          limit,
        });
        if (cancelled) return;
        setProblems(res.data.problems);
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
  }, [search, difficulty, topic, progress, page, limit, reloadKey]);

  const hasFilters = Boolean(search || difficulty || topic || progress);

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
            Practice
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Problem{" "}
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              set
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/45 sm:text-base">
            Filter by difficulty or topic, or search by title. Every problem is
            checked against hidden tests.
          </p>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-start/10 text-primary-start">
            <Code2 className="size-6" />
          </span>
          <p className="text-sm leading-5 text-white/45">
            Solve.
            <br />
            Learn.
            <br />
            Grow together.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <ProblemFilters
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          difficulty={difficulty}
          onDifficultyChange={(value) => updateParams({ difficulty: value })}
          topic={topic}
          onTopicChange={(value) => updateParams({ topic: value })}
          topics={topics}
          progress={progress}
          onProgressChange={(value) => updateParams({ progress: value })}
        />
      </div>

      <p className="mb-3 mt-6">
        <span className="text-2xl font-semibold text-primary-start">
          {pagination.total}
        </span>{" "}
        <span className="text-sm text-white/45">problems</span>
      </p>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-card backdrop-blur-xl">
        <div
          className={`hidden grid-cols-1 gap-3 border-b border-white/8 px-5 py-3 text-xs font-medium uppercase tracking-wider text-white/35 md:grid ${ROW_GRID}`}
        >
          <span>Title</span>
          <span>Difficulty</span>
          <span>Acceptance</span>
          <span>Topics</span>
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
              {hasFilters
                ? "No problems match your filters"
                : "No problems yet"}
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
          problems.map((problem, i) => (
            <ProblemRow key={problem._id} problem={problem} index={i} />
          ))}
      </div>

      {!loading && !error && pagination.total > 0 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          onPageChange={changePage}
          onLimitChange={(value) => updateParams({ limit: value })}
        />
      )}
    </div>
  );
};

export default ProblemsPage;
