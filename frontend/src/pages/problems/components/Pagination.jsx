import { ChevronLeft, ChevronRight } from "lucide-react";

// builds lists like [1, "...", 4, 5, 6, "...", 20]
const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push("...");
    result.push(p);
  });
  return result;
};

const arrowStyles =
  "grid size-9 place-items-center rounded-lg border border-white/8 text-white/55 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:pointer-events-none disabled:opacity-40";

const Pagination = ({ page, totalPages, total, limit, onPageChange, onLimitChange }) => {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // keeps the dropdown correct even if the URL has an unusual limit
  const limitOptions = [...new Set([10, 20, 50, limit])].sort((a, b) => a - b);

  return (
    <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
      <p className="text-sm text-white/45">
        Showing {from}-{to} of {total} problems
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={arrowStyles}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>

        {getPageNumbers(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-white/30">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`grid size-9 place-items-center rounded-lg text-sm font-medium transition-colors duration-200 ${
                p === page
                  ? "bg-linear-to-r from-primary-start to-primary-end text-white"
                  : "border border-white/8 text-white/55 hover:border-white/15 hover:text-white"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={arrowStyles}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/45">
        Rows per page
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded-lg border border-white/8 bg-recessed px-2.5 py-1.5 text-sm text-white outline-none [&>option]:bg-background"
        >
          {limitOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default Pagination;