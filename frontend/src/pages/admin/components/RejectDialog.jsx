import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import Spinner from "../../../components/Spinner.jsx";

const MIN_REASON = 3;
const MAX_REASON = 500;

// rejecting needs a reason, it stays on the problem so the next edit knows what to fix
const RejectDialog = ({ open, title, busy = false, error = "", onConfirm, onCancel }) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  const valid = reason.trim().length >= MIN_REASON;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onCancel();
          }}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid && !busy) onConfirm(reason.trim());
            }}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl border border-white/8 bg-card p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-red-400/10 text-red-400">
              <TriangleAlert className="size-5" />
            </span>

            <h2 id="reject-title" className="mt-4 text-lg font-semibold text-white">
              Reject this problem?
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/55">
              "{title}" will not be published. Say what is wrong, the reason stays on the problem.
            </p>

            <label htmlFor="reject-reason" className="sr-only">
              Reason
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              value={reason}
              maxLength={MAX_REASON}
              autoFocus
              onChange={(e) => setReason(e.target.value)}
              placeholder="For example: the statement allows more than one correct answer."
              className="mt-4 w-full resize-y rounded-xl border border-white/8 bg-recessed px-3.5 py-2.5 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/25 hover:border-white/12 focus:border-red-400/50 focus:bg-editor focus:ring-2 focus:ring-red-400/10"
            />
            <p className="mt-1.5 text-xs text-white/35">
              {reason.trim().length} / {MAX_REASON}
            </p>

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
                onClick={onCancel}
                disabled={busy}
                className="rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!valid || busy}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-400 disabled:pointer-events-none disabled:opacity-50"
              >
                {busy && <Spinner />}
                Reject problem
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default RejectDialog;