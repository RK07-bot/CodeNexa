import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true, // required so the browser actually sends the httpOnly cookies
});

let isRefreshing = false;
let pendingRequests = [];

const resolvePending = () => {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // only retry once, and only for an expired access token — not every 401
    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error);
    }

    // don't try to "refresh the refresh" — if /refresh itself returns 401, just fail
    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    // if a refresh is already happening, queue this request instead of
    // firing a second simultaneous refresh call
    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push(() => resolve(api(originalRequest)));
      });
    }

    isRefreshing = true;

    try {
      await api.post("/auth/refresh");
      resolvePending();
      return api(originalRequest);
    } catch (refreshError) {
      pendingRequests = [];
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
