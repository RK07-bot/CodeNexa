import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { verifyEmail } from "../../api/auth.api.js";

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        await verifyEmail(token);
        setStatus("success");
      } catch (err) {
        setMessage(
          err.response?.data?.message ||
            "This verification link is invalid or has expired."
        );
        setStatus("failed");
      }
    };

    run();
  }, [token]);

  return (
    <div className="relative flex h-dvh flex-col items-center overflow-hidden bg-background px-4 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-primary-end/10 blur-3xl" />

      {/* Brand */}
      <div className="relative z-10 w-full max-w-md shrink-0 pt-7 text-center">
        <Link
          to="/"
          aria-label="Go to CodeNexa home"
          className="inline-block"
        >
          <p className="text-2xl font-bold tracking-tight">
            Code
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              Nexa
            </span>
          </p>
        </Link>

        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-white/10" />

          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
            Technical Interview Practice
          </span>

          <span className="h-px w-8 bg-white/10" />
        </div>
      </div>

      {/* Back to Home */}
      <div className="relative z-10 mt-5 w-full max-w-md shrink-0">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-white/45 transition-colors hover:text-primary-start"
        >
          <span>←</span>
          Back to home
        </Link>
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center py-3">
        <div className="w-full rounded-2xl border border-white/8 bg-card p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
          {/* Verifying State */}
          {status === "verifying" && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-primary-start" />

              <p className="text-sm text-white/45">
                Verifying your email...
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-start/20 bg-primary-start/10">
                <span className="text-lg">✓</span>
              </div>

              <h2 className="text-lg font-semibold text-white">
                Email verified
              </h2>

              <p className="mt-2 text-sm leading-5 text-white/45">
                Your account has been created. You can sign in now.
              </p>

              <button
                onClick={() => navigate("/login")}
                className="mt-5 w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                Go to sign in
              </button>
            </div>
          )}

          {/* Failed State */}
          {status === "failed" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <span className="text-lg text-red-400">!</span>
              </div>

              <h2 className="text-lg font-semibold text-white">
                Verification failed
              </h2>

              <p className="mt-2 text-sm leading-5 text-white/45">
                {message}
              </p>

              <p className="mt-5 text-center text-xs leading-5 text-white/45">
                Need a new verification link? Register again to request one, or{" "}
                <Link
                  to="/register"
                  className="font-medium text-primary-start transition-colors hover:text-primary-end"
                >
                  go to register
                </Link>
                .
              </p>

              <button
                onClick={() => navigate("/login")}
                className="mt-5 w-full rounded-xl border border-white/8 bg-recessed py-2.5 text-sm font-medium text-white/75 transition-all hover:border-white/12 hover:text-white"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VerifyEmailPage;