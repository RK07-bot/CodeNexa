import { Link } from "react-router-dom";

export const SessionCard = ({ children }) => (
  <div className="w-full max-w-md rounded-2xl border border-white/8 bg-card p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
    {children}
  </div>
);

const SessionShell = ({ children }) => (
  <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-white">
    <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary-start/10 blur-3xl" />

    <header className="relative flex h-14 items-center justify-between px-4 sm:px-6">
      <Link to="/" className="text-xl font-bold tracking-tight">
        Code
        <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
          Nexa
        </span>
      </Link>
      <Link
        to="/problems"
        className="text-sm text-white/55 transition-colors duration-200 hover:text-white"
      >
        All problems
      </Link>
    </header>

    <main className="relative flex flex-1 items-center justify-center px-4 py-8">{children}</main>
  </div>
);

export default SessionShell;