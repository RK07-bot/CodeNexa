import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { verifyOtp, changePassword, resendOtp } from "../../api/auth.api.js";

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const [step, setStep] = useState("otp"); // "otp" | "password"
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await verifyOtp({ email, otp });
      setResetToken(res.data.resetToken);
      setStep("password");
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(
        errors?.otp?.[0] ||
          err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage("");

    try {
      await resendOtp(email);
      setResendMessage("A new code has been sent — check your inbox.");
    } catch (err) {
      const errors = err.response?.data?.errors;
      setResendMessage(
        errors?.email?.[0] || err.response?.data?.message || "Couldn't resend. Try again shortly."
      );
    } finally {
      setResending(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await changePassword({ resetToken, newPassword, confirmNewPassword });
      setDone(true);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(
        errors?.newPassword?.[0] ||
          err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="relative flex h-dvh items-center justify-center bg-background px-4 text-white">
        <div className="text-center">
          <p className="text-sm text-white/45">Start by requesting a reset code first.</p>
          <Link to="/forgot-password" className="mt-3 inline-block text-sm font-medium text-primary-start">
            Go to forgot password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-background px-4 py-4 text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-primary-end/10 blur-3xl" />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <div className="mb-4 text-center">
          <p className="text-2xl font-bold tracking-tight">
            Code<span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">Nexa</span>
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-white/10" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">Technical Interview Practice</span>
            <span className="h-px w-8 bg-white/10" />
          </div>
        </div>

        <div className="w-full rounded-2xl border border-white/8 bg-card p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          {done ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-start/20 bg-primary-start/10">
                <span className="text-lg">✓</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Password changed</h2>
              <p className="mt-2 text-sm leading-5 text-white/45">
                You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="mt-5 w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white"
              >
                Back to sign in
              </button>
            </div>
          ) : step === "otp" ? (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Enter the code</h1>
                <p className="mt-1.5 text-sm leading-5 text-white/45">
                  We sent a 6-digit code to <span className="text-white/75">{email}</span>.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="otp" className="block text-xs font-medium text-white/65">Verification code</label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-recessed px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-white placeholder:text-white/25 outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5">
                    <p className="text-sm leading-5 text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify code"}
                </button>
              </form>

              {resendMessage && <p className="mt-3 text-center text-xs text-primary-start">{resendMessage}</p>}

              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-3 w-full rounded-xl border border-white/8 bg-recessed py-2.5 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? "Resending..." : "Resend code"}
              </button>
            </>
          ) : (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Set a new password</h1>
                <p className="mt-1.5 text-sm leading-5 text-white/45">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="block text-xs font-medium text-white/65">New password</label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-recessed px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmNewPassword" className="block text-xs font-medium text-white/65">Confirm new password</label>
                  <input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="Repeat password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-recessed px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200 hover:border-white/12 focus:border-primary-start/50 focus:bg-editor focus:ring-2 focus:ring-primary-start/10"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/15 bg-red-500/7 px-3.5 py-2.5">
                    <p className="text-sm leading-5 text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Changing password..." : "Change password"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-3 text-center text-[10px] text-white/25">Secure access to your technical interview workspace</p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;