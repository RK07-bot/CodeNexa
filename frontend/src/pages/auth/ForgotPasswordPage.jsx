import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api/auth.api.js";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-primary-end/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-tight">
            Code
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              Nexa
            </span>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-white/10" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
              Technical Interview Practice
            </span>
            <span className="h-px w-8 bg-white/10" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-card p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
          {!sent ? (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Reset your password
                </h1>
                <p className="mt-2 text-sm leading-6 text-white/45">
                  Enter your email and we'll send you a code to reset it.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-white/65"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-recessed px-3.5 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-3">
                    <p className="text-sm leading-5 text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end py-3 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-start/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send reset code"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-white/45">
                Remembered it?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary-start hover:text-primary-end"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-start/20 bg-primary-start/10">
                <span className="text-lg">✉</span>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Check your inbox
              </h2>
              <p className="mt-2 text-sm leading-5 text-white/45">
                If <span className="text-white/75">{email}</span> is registered,
                a 6-digit code has been sent. It expires in 5 minutes.
              </p>
              <button
                onClick={() =>
                  navigate("/reset-password", { state: { email } })
                }
                className="mt-5 w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white"
              >
                Enter code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
