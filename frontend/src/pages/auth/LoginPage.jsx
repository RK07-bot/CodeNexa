import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../api/auth.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Link } from "react-router-dom";
import {useLocation} from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState(null); // holds { device, loggedInAt } when a conflict happens

  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // back to the page they were trying to open, or the problem list by default
// (switch the default to /dashboard once that page exists)
const redirectTo = location.state?.from
  ? `${location.state.from.pathname}${location.state.from.search}`
  : "/problems";

  const attemptLogin = async (force = false) => {
    setLoading(true);
    setError("");

    try {
      const res = await loginUser({ email, password, force });
      setUser(res.data.user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const data = err.response?.data;

      // a 409 isn't a real failure here — it's asking the user to confirm a takeover
      if (data?.sessionConflict) {
        setConflict(data.existingSession);
      } else {
        setError(
          data?.errors?.email?.[0] ||
            data?.errors?.password?.[0] ||
            data?.message ||
            "Something went wrong. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    attemptLogin(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-primary-end/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Brand */}
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

        {/* Login Card */}
        <div className="rounded-2xl border border-white/8 bg-card p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
          {/* Header */}
          <div className="mb-7">
            <div className="mb-3 inline-flex items-center rounded-lg border border-primary-start/20 bg-primary-start/10 px-2.5 py-1">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary-start shadow-[0_0_8px_rgba(139,92,246,0.8)]" />

              <span className="text-xs font-medium text-primary-start">
                Welcome back
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Sign in to your account
            </h1>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Sign in to continue practicing.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
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
                className="
                  w-full rounded-xl
                  border border-white/8
                  bg-recessed
                  px-3.5 py-3
                  text-sm text-white
                  placeholder:text-white/25
                  outline-none
                  transition-all duration-200
                  hover:border-white/12
                  focus:border-primary-start/50
                  focus:bg-editor
                  focus:ring-2 focus:ring-primary-start/10
                "
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-white/65"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full rounded-xl
                  border border-white/8
                  bg-recessed
                  px-3.5 py-3
                  text-sm text-white
                  placeholder:text-white/25
                  outline-none
                  transition-all duration-200
                  hover:border-white/12
                  focus:border-primary-start/50
                  focus:bg-editor
                  focus:ring-2 focus:ring-primary-start/10
                "
                required
              />
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary-start hover:text-primary-end"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-3">
                <p className="text-sm leading-5 text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                flex w-full items-center justify-center gap-2
                rounded-xl
                bg-linear-to-r from-primary-start to-primary-end
                py-3
                text-sm font-semibold text-white
                shadow-lg shadow-primary-start/15
                transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-xl hover:shadow-primary-start/20
                active:translate-y-0
                disabled:cursor-not-allowed
                disabled:opacity-60
                disabled:hover:translate-y-0
              "
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-white/25">
          Secure access to your technical interview workspace
        </p>
      </div>

      {/* Session Conflict Modal */}
      {conflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div
            className="
              w-full max-w-md
              rounded-2xl
              border border-white/8
              bg-card
              p-6
              shadow-2xl shadow-black/40
              backdrop-blur-xl
              animate-in
              fade-in
              zoom-in-95
              duration-200
            "
          >
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-amber-400">
                <span className="text-sm font-bold">!</span>
              </div>

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">
                  Active session detected
                </h2>

                <p className="mt-1 text-sm leading-5 text-white/45">
                  You're already logged in on{" "}
                  <span className="font-medium text-white/75">
                    {conflict.device}
                  </span>
                  .
                </p>
              </div>
            </div>

            {/* Modal Explanation */}
            <div className="mt-5 rounded-xl border border-white/6 bg-recessed px-4 py-3">
              <p className="text-xs leading-5 text-white/45">
                Log out that device and continue your session on this device.
              </p>
            </div>

            {/* Existing Action */}
            <button
              onClick={() => attemptLogin(true)}
              className="
                mt-5
                w-full
                rounded-xl
                bg-linear-to-r from-primary-start to-primary-end
                py-3
                text-sm font-semibold text-white
                shadow-lg shadow-primary-start/15
                transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-xl hover:shadow-primary-start/20
                active:translate-y-0
              "
            >
              Log out that device and continue here
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
