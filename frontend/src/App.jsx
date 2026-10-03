import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage.jsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.jsx";


function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage/>}></Route>
      <Route path="/register" element={<RegisterPage/>}></Route>
      <Route path="/forgot-password" element={<ForgotPasswordPage/>}></Route>
      <Route path="/reset-password" element={<ResetPasswordPage/>}></Route>
      <Route path="/verify/:token" element={<VerifyEmailPage/>}></Route>
      
    </Routes>
  )
}

export default App;
