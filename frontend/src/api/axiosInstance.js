import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true, // required so the browser actually sends the httpOnly cookies
});

export default api;