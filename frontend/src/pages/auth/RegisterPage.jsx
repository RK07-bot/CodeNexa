import { useState } from "react";
import { registerUser, resendVerificationEmail } from "../../api/auth.api.js";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await registerUser({ username, email, password });
      setSubmitted(true);
    } catch (err) {
      const errors = err.response?.data?.errors;

      setError(
        errors?.username?.[0] ||
          errors?.email?.[0] ||
          errors?.password?.[0] ||
          errors?.message||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage("");

    try {
      await resendVerificationEmail(email);
      setResendMessage("Verification email resent — check your inbox.");
    } catch (err) {
      setResendMessage(
        err.response?.data?.errors?.message ||
          "Couldn't resend. Try again shortly.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-background px-4 py-4 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-primary-end/10 blur-3xl" />

      <div className="relative flex w-full max-w-md flex-col items-center">
        {/* Brand */}
        <div className="mb-4 text-center">
          <p className="text-2xl font-bold tracking-tight">
            Code
            <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
              Nexa
            </span>
          </p>

          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-white/10" />

            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
              Technical Interview Practice
            </span>

            <span className="h-px w-8 bg-white/10" />
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-white/8 bg-card p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          {!submitted ? (
            <>
              {/* Header */}
              <div className="mb-5">
                <div className="mb-2 inline-flex items-center rounded-lg border border-primary-start/20 bg-primary-start/10 px-2.5 py-1">
                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary-start shadow-[0_0_8px_rgba(139,92,246,0.8)]" />

                  <span className="text-xs font-medium text-primary-start">
                    Join CodeNexa
                  </span>
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Create your account
                </h1>

                <p className="mt-1.5 text-sm leading-5 text-white/45">
                  Start practicing with a partner.
                </p>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Username */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="username"
                    className="block text-xs font-medium text-white/65"
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    type="text"
                    placeholder="yourhandle"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="
                      w-full rounded-xl
                      border border-white/8
                      bg-recessed
                      px-3.5 py-2.5
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

                {/* Email */}
                <div className="space-y-1.5">
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
                      px-3.5 py-2.5
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
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-white/65"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="
                      w-full rounded-xl
                      border border-white/8
                      bg-recessed
                      px-3.5 py-2.5
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

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-medium text-white/65"
                  >
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="
                      w-full rounded-xl
                      border border-white/8
                      bg-recessed
                      px-3.5 py-2.5
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

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5">
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
                    py-2.5
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
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>
            </>
          ) : (
            /* Verification state */
            <div className="py-4 text-center">
              {/* Email Icon */}
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-start/20 bg-primary-start/10">
                <span className="text-lg">✉</span>
              </div>

              <h2 className="text-lg font-semibold text-white">
                Check your inbox
              </h2>

              <p className="mt-2 text-sm leading-5 text-white/45">
                We sent a verification link to{" "}
                <span className="text-white/75">{email}</span>. It expires in 5
                minutes.
              </p>

              {/* Resend Feedback */}
              {resendMessage && (
                <p className="mt-3 text-xs leading-5 text-primary-start">
                  {resendMessage}
                </p>
              )}

              {/* Resend Button */}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="
                  mt-5
                  w-full
                  rounded-xl
                  border border-white/8
                  bg-recessed
                  py-2.5
                  text-sm font-medium text-white/75
                  transition-all duration-200
                  hover:border-white/12
                  hover:bg-editor
                  hover:text-white
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {resending ? "Resending..." : "Resend email"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-3 text-center text-[10px] text-white/25">
          Secure access to your technical interview workspace
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
