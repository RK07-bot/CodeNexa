import api from "./axiosInstance.js";

export const loginUser = (credentials) => api.post("/auth/login", credentials);

export const registerUser = (data) => api.post("/auth/register", data);

export const verifyEmail = (token) => api.get(`/auth/verify/${token}`);

export const resendVerificationEmail = (email) =>
  api.post("/auth/resend-verification", { email });

export const forgotPassword = (email) =>
  api.post("/auth/forgot-password", { email });

export const verifyOtp = (data) => api.post("/auth/verify-otp", data);

export const resendOtp = (email) => api.post("/auth/resend-otp", { email });

export const changePassword = (data) => api.post("/auth/change-password", data);

export const logoutUser = () => api.post("/auth/logout");

export const getMyProfile = () => api.get("/auth/me");
