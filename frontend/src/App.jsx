import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.jsx";
import HomePage from "./pages/home/HomePage.jsx";
import ProblemsPage from "./pages/problems/ProblemsPage.jsx";
import SubmitProblemPage from "./pages/submit/SubmitProblemPage.jsx";
import ProblemPage from "./pages/problems/ProblemPage.jsx";
import SessionPage from "./pages/session/SessionPage.jsx";
import RoomsPage from "./pages/rooms/RoomsPage.jsx";
import DashboardPage from "./pages/dashboard/DashboardPage.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import AdminPage from "./pages/admin/AdminPage.jsx";
import ProblemFormPage from "./pages/admin/ProblemFormPage.jsx";

function App() {
  return (
    <Routes>
      {/* auth pages have no navbar — they're a separate, focused flow */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify/:token" element={<VerifyEmailPage />} />

      {/* everything else shares the navbar */}
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
  );
}

export default App;