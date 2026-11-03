import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Lock, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { logoutUser } from "../api/auth.api.js";

const navLinks = [
  { label: "Problems", to: "/problems" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "Find a room", to: "/rooms" },
  { label: "Submit problem", to: "/submit" },
  { label: "Admin", to: "/admin" },
];

const Navbar = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const shakeControls = useAnimation();

  const [showNudge, setShowNudge] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setMobileMenuOpen(false);
    navigate("/");
  };

  const handleProtectedClick = (e) => {
    if (user) {
      setMobileMenuOpen(false);
      return;
    }

    e.preventDefault();

    shakeControls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.45 },
    });

    setShowNudge(true);

    setTimeout(() => setShowNudge(false), 1800);
  };

  const handleMobileLinkClick = (e) => {
    handleProtectedClick(e);

    if (user) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="text-xl font-bold tracking-tight">
          Code
          <span className="bg-linear-to-r from-primary-start to-primary-end bg-clip-text text-transparent">
            Nexa
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map(
            (link) =>
              (link.label !== "Admin" || user?.role === "admin") && (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={(e) => handleProtectedClick(e)}
                  className="group relative text-sm text-white/65 transition-colors duration-200 hover:text-white"
                >
                  {link.label}

                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-linear-to-r from-primary-start to-primary-end transition-all duration-300 group-hover:w-full" />
                </Link>
              )
          )}
        </nav>

        {/* Desktop actions */}
        <div className="relative hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-white/65">
                {user.username}
              </span>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/8 px-3.5 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/12 hover:text-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-white/65 transition-colors duration-200 hover:text-white"
              >
                Log in
              </Link>

              <motion.div animate={shakeControls}>
                <Link
                  to="/register"
                  className="inline-block rounded-lg bg-linear-to-r from-primary-start to-primary-end px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-start/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-start/25"
                >
                  Get started
                </Link>
              </motion.div>

              <AnimatePresence>
                {showNudge && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -6,
                      scale: 0.95,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -6,
                      scale: 0.95,
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 flex items-center gap-1.5 rounded-lg border border-white/8 bg-card px-3 py-2 text-xs text-white/75 shadow-xl shadow-black/30"
                  >
                    <Lock
                      size={12}
                      className="text-primary-start"
                    />

                    Sign in to continue
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="grid size-10 place-items-center rounded-lg border border-white/8 text-white/70 transition-colors hover:border-white/15 hover:text-white md:hidden"
          aria-label={
            mobileMenuOpen
              ? "Close menu"
              : "Open menu"
          }
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{
              opacity: 0,
              height: 0,
            }}
            animate={{
              opacity: 1,
              height: "auto",
            }}
            exit={{
              opacity: 0,
              height: 0,
            }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
            className="overflow-hidden border-t border-white/8 md:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              {/* Mobile navigation links */}
              <nav className="flex flex-col">
                {navLinks.map(
                  (link) =>
                    (link.label !== "Admin" ||
                      user?.role === "admin") && (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={(e) =>
                          handleMobileLinkClick(
                            e
                          )
                        }
                        className="border-b border-white/6 py-3.5 text-sm font-medium text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    )
                )}
              </nav>

              {/* Mobile actions */}
              <div className="mt-4">
                {user ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/65">
                      {user.username}
                    </span>

                    <button
                      onClick={handleLogout}
                      className="rounded-lg border border-white/8 px-3.5 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/12 hover:text-white"
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/login"
                      onClick={() =>
                        setMobileMenuOpen(false)
                      }
                      className="flex-1 rounded-lg border border-white/8 px-4 py-2.5 text-center text-sm font-medium text-white/70 transition-colors hover:border-white/15 hover:text-white"
                    >
                      Log in
                    </Link>

                    <motion.div
                      animate={shakeControls}
                      className="flex-1"
                    >
                      <Link
                        to="/register"
                        onClick={() =>
                          setMobileMenuOpen(false)
                        }
                        className="block rounded-lg bg-linear-to-r from-primary-start to-primary-end px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-primary-start/15"
                      >
                        Get started
                      </Link>
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Mobile nudge */}
              <AnimatePresence>
                {showNudge && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -6,
                      scale: 0.95,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -6,
                      scale: 0.95,
                    }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/8 bg-card px-3 py-2 text-xs text-white/75 shadow-xl shadow-black/30"
                  >
                    <Lock
                      size={12}
                      className="text-primary-start"
                    />

                    Sign in to continue
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;