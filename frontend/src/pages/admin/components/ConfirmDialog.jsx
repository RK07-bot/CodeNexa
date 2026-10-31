import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert, ShieldCheck } from "lucide-react";
import Spinner from "../../../components/Spinner.jsx";

// asks before anything risky happens. "danger" makes the confirm button red.
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  error = "",
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  const Icon = danger ? TriangleAlert : ShieldCheck;

  // portal so the dialog is not trapped inside a blurred card
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
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-2xl border border-white/8 bg-card p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <span
              className={`grid size-11 place-items-center rounded-xl ${
                danger
                  ? "bg-red-400/10 text-red-400"
                  : "bg-primary-start/10 text-primary-start"
              }`}
            >
              <Icon className="size-5" />
            </span>

            <h2
              id="confirm-title"
              className="mt-4 text-lg font-semibold text-white"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/55">{message}</p>

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
                autoFocus
                className="rounded-xl border border-white/8 px-4 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60 ${
                  danger
                    ? "bg-red-500 shadow-lg shadow-red-500/15 hover:bg-red-400"
                    : "bg-linear-to-r from-primary-start to-primary-end shadow-lg shadow-primary-start/15"
                }`}
              >
                {busy && <Spinner />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ConfirmDialog;