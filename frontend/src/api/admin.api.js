import api from "./axiosInstance.js";

// empty filters are dropped, the backend rejects values like role=""
const clean = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value != null),
  );

// the timezone lets the server work out "today" for the admin
export const getOverview = () =>
  api.get("/admin/overview", {
    params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });

export const getUsers = (filters) =>
  api.get("/admin/users", { params: clean(filters) });

export const updateUserRole = (userId, role) =>
  api.patch(`/admin/users/${userId}/role`, { role });

export const getAdminProblems = (filters) =>
  api.get("/admin/problems", { params: clean(filters) });

export const getAdminTopics = () => api.get("/admin/problems/topics");

// runs every test against the reference solution, so it can take a while
export const validateProblem = (problemId) =>
  api.post(`/admin/problems/${problemId}/validate`);

// status is "approved" (publish) or "draft" (unpublish)
export const setProblemStatus = (problemId, status) =>
  api.patch(`/admin/problems/${problemId}/status`, { status });

export const deleteProblem = (problemId) =>
  api.delete(`/admin/problems/${problemId}`);

// the whole problem for the edit form, hidden tests and reference solution included
export const getAdminProblem = (problemId) =>
  api.get(`/admin/problems/${problemId}`);

export const createProblem = (body) => api.post("/admin/problems", body);

export const updateProblem = (problemId, body) =>
  api.put(`/admin/problems/${problemId}`, body);

export const getActivity = (filters) =>
  api.get("/admin/activity", { params: clean(filters) });


// the AI writes a whole problem from a short idea, in the background
export const createAiDraft = (body) => api.post("/admin/problems/ai-draft", body);

export const regenerateProblem = (problemId) =>
  api.post(`/admin/problems/${problemId}/regenerate`);

export const rejectProblem = (problemId, reason) =>
  api.post(`/admin/problems/${problemId}/reject`, { reason });