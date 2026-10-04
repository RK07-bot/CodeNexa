import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.jsx";
import HomePage from "./pages/home/HomePage.jsx";

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
        {/* Problems, Dashboard, Rooms, Submit, Admin, Session routes go here as we build them */}
      </Route>
    </Routes>
  );
}

export default App;