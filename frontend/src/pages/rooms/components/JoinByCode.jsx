import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Link2 } from "lucide-react";

const CODE_PATTERN = /^[A-Z0-9]{6}$/;

const JoinByCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const value = code.trim().toUpperCase();

    if (!CODE_PATTERN.test(value)) {
      setError("Room codes are 6 characters, like QWM473.");
      return;
    }

    // the invite preview shows which room it is before anyone joins
    navigate(`/session/${value}`);
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-card p-5 backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-start/10 text-primary-start">
          <Link2 className="size-7" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white">Join a private room</h2>
          <p className="mt-1 text-sm text-white/45">Enter the room code your partner shared with you.</p>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError("");
                }}
                maxLength={6}
                placeholder="E.g. QWM473"
                spellCheck={false}
                className="w-full rounded-xl border border-white/8 bg-recessed py-2.5 pl-10 pr-3.5 font-mono text-sm uppercase tracking-widest text-white outline-none transition-all duration-200 placeholder:normal-case placeholder:tracking-normal placeholder:text-white/25 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-linear-to-r from-primary-start to-primary-end px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5"
            >
              Join room
            </button>
          </form>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default JoinByCode;