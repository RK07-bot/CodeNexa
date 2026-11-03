import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import GuestRoute from "./components/GuestRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";

const LoginPage = lazy(() => import("./pages/auth/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage.jsx"));
const ForgotPasswordPage = lazy(
  () => import("./pages/auth/ForgotPasswordPage.jsx"),
);
const ResetPasswordPage = lazy(
  () => import("./pages/auth/ResetPasswordPage.jsx"),
);
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage.jsx"));

const HomePage = lazy(() => import("./pages/home/HomePage.jsx"));
const ProblemsPage = lazy(() => import("./pages/problems/ProblemsPage.jsx"));
const SubmitProblemPage = lazy(
  () => import("./pages/submit/SubmitProblemPage.jsx"),
);
const ProblemPage = lazy(() => import("./pages/problems/ProblemPage.jsx"));
const SessionPage = lazy(() => import("./pages/session/SessionPage.jsx"));
const RoomsPage = lazy(() => import("./pages/rooms/RoomsPage.jsx"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage.jsx"));

const AdminPage = lazy(() => import("./pages/admin/AdminPage.jsx"));
const ProblemFormPage = lazy(() => import("./pages/admin/ProblemFormPage.jsx"));
const ProblemReviewPage = lazy(
  () => import("./pages/admin/ProblemReviewPage.jsx"),
);

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          Loading page...
        </div>
      }
    >
      <Routes>
        {/* Guest-only authentication pages */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />

        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />

        {/* Password recovery and email verification remain accessible */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify/:token" element={<VerifyEmailPage />} />

        {/* Pages sharing the main navbar */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />

          <Route
            path="/problems"
            element={
              <ProtectedRoute>
                <ProblemsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <SubmitProblemPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <RoomsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/problems/new"
            element={
              <AdminRoute>
                <ProblemFormPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/problems/:id/edit"
            element={
              <AdminRoute>
                <ProblemFormPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/problems/:id/review"
            element={
              <AdminRoute>
                <ProblemReviewPage />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>

        <Route
          path="/problems/:slug"
          element={
            <ProtectedRoute>
              <ProblemPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/session/:code"
          element={
            <ProtectedRoute>
              <SessionPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
