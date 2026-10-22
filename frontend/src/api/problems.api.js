import api from "./axiosInstance.js";

export const getProblems = (filters) => {
  // empty filters are dropped, the backend rejects difficulty=""
  const params = Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== "" && value != null,
    ),
  );
  return api.get("/problems", { params });
};

export const getTopics = () => api.get("/problems/topics");

export const getProblem = (slug) => api.get(`/problems/${slug}`);
export const runCode = (slug, payload) =>
  api.post(`/problems/${slug}/run`, payload);
export const submitCode = (slug, payload) =>
  api.post(`/problems/${slug}/submit`, payload);
export const getSubmissions = (slug) =>
  api.get(`/problems/${slug}/submissions`);
