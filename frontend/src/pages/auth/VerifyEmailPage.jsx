import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { verifyEmail, resendVerificationEmail } from "../../api/auth.api.js";

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("verifying"); // "verifying" | "success" | "failed"
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await verifyEmail(token);
        setEmail(res.data.user?.email || "");
        setStatus("success");
      } catch (err) {
        setMessage(err.response?.data?.message || "This verification link is invalid or has expired.");
        setStatus("failed");
      }
    };

    run();
    // token is read once on mount — this page isn't meant to re-verify on its own
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    if (!email) return;

    setResending(true);
    setResendMessage("");

    try {
      await resendVerificationEmail(email);
      setResendMessage("A new verification link has been sent — check your inbox.");
    } catch (err) {
      const errors = err.response?.data?.errors;
      setResendMessage(errors?.email?.[0] || err.response?.data?.message || "Couldn't resend. Try again shortly.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-background px-4 py-4 text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-72 w-72 rounded-full bg-primary-end/10 blur-3xl" />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <div className="mb-4 text-center">
          <p className="text-2xl font-bold tracking-tight">
            Code<span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">Nexa</span>
          </p>
        </div>

        <div className="w-full rounded-2xl border border-white/8 bg-card p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          {status === "verifying" && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-primary-start" />
              <p className="text-sm text-white/45">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary-start/20 bg-primary-start/10">
                <span className="text-lg">✓</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Email verified</h2>
              <p className="mt-2 text-sm leading-5 text-white/45">
                Your account has been created. You can sign in now.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="mt-5 w-full rounded-xl bg-linear-to-r from-primary-start to-primary-end py-2.5 text-sm font-semibold text-white"
              >
                Go to sign in
              </button>
            </div>
          )}

          {status === "failed" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <span className="text-lg text-red-400">!</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Link expired</h2>
              <p className="mt-2 text-sm leading-5 text-white/45">{message}</p>

              {resendMessage && <p className="mt-3 text-xs text-primary-start">{resendMessage}</p>}

              <p className="mt-5 text-center text-xs text-white/45">
                Already know your email? Register again to get a new link, or{" "}
                <Link to="/register" className="font-medium text-primary-start hover:text-primary-end">
                  go to register
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;