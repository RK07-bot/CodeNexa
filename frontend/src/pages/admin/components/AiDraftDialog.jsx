import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { createAiDraft } from "../../../api/admin.api.js";
import Pills from "../../../components/Pills.jsx";
import Spinner from "../../../components/Spinner.jsx";

const MIN_IDEA = 20;
const MAX_IDEA = 2000;

const DIFFICULTIES = [
  { value: "", label: "Let the AI decide" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

// the admin types a short idea, the AI writes the whole problem in the background
const AiDraftDialog = ({ open, onClose, onCreated }) => {
  const [idea, setIdea] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // every opening starts from an empty form
  useEffect(() => {
    if (open) {
      setIdea("");
      setDifficulty("");
      setBusy(false);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !busy) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  const length = idea.trim().length;
  const tooShort = length < MIN_IDEA;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tooShort || busy) return;

    setBusy(true);
    setError("");

    try {
      const res = await createAiDraft({
        idea: idea.trim(),
        difficulty: difficulty || undefined,
      });
      onCreated(res.data.message);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.errors?.idea?.[0] || data?.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-draft-title"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-lg rounded-2xl border border-white/8 bg-card p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-primary-start/10 text-primary-start">
              <Sparkles className="size-5" />
            </span>

            <h2 id="ai-draft-title" className="mt-4 text-lg font-semibold text-white">
              Draft a problem with AI
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Describe the idea in a few sentences. The AI writes the statement, constraints,
              examples, a solution and the hidden tests, then checks them by running the code.
              You review the result before anything is published.
            </p>

            <label htmlFor="ai-idea" className="mt-5 block text-sm font-medium text-white/75">
              Idea
            </label>
            <textarea
              id="ai-idea"
              rows={6}
              value={idea}
              maxLength={MAX_IDEA}
              autoFocus
              onChange={(e) => setIdea(e.target.value)}
              placeholder="For example: given a list of daily temperatures, find for each day how many days pass until a warmer one. Medium difficulty, needs a stack."
              className="mt-2 w-full resize-y rounded-xl border border-white/8 bg-recessed px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/25 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
            />
            <p className={`mt-1.5 text-xs ${tooShort && length > 0 ? "text-amber-400" : "text-white/35"}`}>
              {tooShort
                ? `At least ${MIN_IDEA} characters (${length}/${MIN_IDEA})`
                : `${length} / ${MAX_IDEA}`}
            </p>

            <p className="mt-4 text-sm font-medium text-white/75">Difficulty</p>
            <div className="mt-2">
              <Pills
                options={DIFFICULTIES}
                value={difficulty}
                onChange={setDifficulty}
                layoutId="ai-draft-difficulty"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-400"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={tooShort || busy}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
              >
                {busy ? <Spinner /> : <Sparkles className="size-4" />}
                Start drafting
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default AiDraftDialog;