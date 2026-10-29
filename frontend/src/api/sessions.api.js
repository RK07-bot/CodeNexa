import api from "./axiosInstance.js";

export const createSession = (payload) => api.post("/sessions", payload);

export const getPublicSessions = (filters) => {
  // empty filters are dropped, the backend rejects empty values
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value != null),
  );
  return api.get("/sessions/public", { params });
};

export const getMyOpenSession = () => api.get("/sessions/me/current");
export const getSession = (code) => api.get(`/sessions/${code}`);
export const joinSession = (code) => api.post(`/sessions/${code}/join`);
export const cancelSession = (code) => api.post(`/sessions/${code}/cancel`);
export const endSession = (code) => api.post(`/sessions/${code}/end`);
export const startNextSession = (code, problem) =>
  api.post(`/sessions/${code}/next`, { problem });