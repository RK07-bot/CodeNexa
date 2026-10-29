import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { getProblems } from "../../../api/problems.api.js";
import DifficultyBadge from "../../../components/DifficultyBadge.jsx";
import useDebounce from "../../../hooks/useDebounce.js";

const ProblemPicker = ({ open, onClose, onPick, picking, error, currentSlug }) => {
  const [input, setInput] = useState("");
  const search = useDebounce(input.trim());
  const [state, setState] = useState({ status: "loading", items: [] });

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setState((prev) => ({ ...prev, status: "loading" }));

    getProblems({ search, limit: 8, page: 1 })
      .then((res) => {
        if (!cancelled) setState({ status: "ready", items: res.data.problems });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [open, search]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape" && !picking) onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, picking, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !picking && onClose()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose the next problem"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/8 bg-card p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Choose the next problem</h2>
                <p className="mt-1 text-sm text-white/45">Both of you will move to it right away.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={Boolean(picking)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-white/45 transition-colors duration-200 hover:text-white disabled:opacity-40"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search by title or topic"
                autoFocus
                className="w-full rounded-xl border border-white/8 bg-recessed py-2.5 pl-10 pr-3.5 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/25 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
              {state.status === "loading" &&
                [0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />)}

              {state.status === "error" && (
                <p className="py-6 text-center text-sm text-white/45">Could not load problems.</p>
              )}

              {state.status === "ready" && state.items.length === 0 && (
                <p className="py-6 text-center text-sm text-white/45">No problems match your search.</p>
              )}

              {state.status === "ready" &&
                state.items.map((p) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => onPick(p.slug)}
                    disabled={Boolean(picking)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-recessed/60 px-3.5 py-2.5 text-left transition-colors duration-200 hover:border-primary-start/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{p.title}</span>
                      <span className="mt-0.5 block truncate text-xs capitalize text-white/40">
                        {p.topics.slice(0, 2).join(", ")}
                        {p.slug === currentSlug && " · just solved"}
                      </span>
                    </span>

                    {picking === p.slug ? (
                      <span className="text-xs text-white/55">Starting...</span>
                    ) : (
                      <DifficultyBadge difficulty={p.difficulty} />
                    )}
                  </button>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProblemPicker;