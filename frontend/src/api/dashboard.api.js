import api from "./axiosInstance.js";

// the timezone lets the server work out "today", the streak and "this month" for the user
export const getDashboard = () =>
  api.get("/dashboard", {
    params: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });