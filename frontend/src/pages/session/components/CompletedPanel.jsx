import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { startNextSession } from "../../../api/sessions.api.js";
import { formatDuration } from "../../../lib/formatDuration.js";
import ProblemPicker from "./ProblemPicker.jsx";

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-white/8 bg-recessed/60 px-3 py-3 text-center">
    <p className="text-lg font-semibold text-white">{value}</p>
    <p className="mt-0.5 text-xs text-white/40">{label}</p>
  </div>
);

const CompletedPanel = ({ session, partner }) => {
  const navigate = useNavigate();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [picking, setPicking] = useState(null);
  const [error, setError] = useState("");

  const partnerHere = Boolean(partner?.connected);

  const pick = async (slug) => {
    setPicking(slug);
    setError("");

    try {
      const res = await startNextSession(session.roomCode, slug);
      navigate(`/session/${res.data.session.roomCode}`);
    } catch (err) {
      const data = err.response?.data;

      // if the next session already exists, the right thing to do is go there
      if (data?.roomCode) {
        navigate(`/session/${data.roomCode}`);
        return;
      }

      setError(data?.message || "Could not start the next session.");
      setPicking(null);
    }
  };

  return (
    <div className="flex min-h-80 min-w-0 flex-1 items-center justify-center rounded-2xl border border-white/8 bg-card px-4 py-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400">
          <CircleCheck className="size-7" />
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Session complete</h2>
        <p className="mt-1.5 text-sm text-white/45">{session.problem.title}</p>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <Stat label="Duration" value={formatDuration(session.durationSeconds)} />
          <Stat label="Submissions" value={session.stats?.submissions ?? 0} />
          <Stat label="Solved" value={session.stats?.solved ? "Yes" : "No"} />
        </div>

        <div className="mt-6 space-y-2.5">
          {session.isHost ? (
            <>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={!partnerHere}
                className="w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                Solve another problem together
              </button>
              {!partnerHere && (
                <p className="text-xs text-white/40">
                  Waiting for {partner?.username ?? "your partner"} to come back.
                </p>
              )}
            </>
          ) : (
            <p className="flex items-center justify-center gap-2.5 rounded-xl border border-white/8 bg-recessed/60 px-4 py-3 text-sm text-white/65">
              <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
              Waiting for {session.host.username} to choose the next problem...
            </p>
          )}

          <Link
            to="/problems"
            className="block rounded-xl border border-white/8 py-2.5 text-center text-sm font-medium text-white/75 transition-colors duration-200 hover:border-white/15 hover:text-white"
          >
            End and go back to problems
          </Link>
        </div>
      </div>

      <ProblemPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={pick}
        picking={picking}
        error={error}
        currentSlug={session.problem.slug}
      />
    </div>
  );
};

export default CompletedPanel;