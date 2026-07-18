import axios from "axios";
import { clearToken, getToken } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }

    // Safety net for ForcePasswordChangeGuard: if the backend says a
    // password change is required but we somehow ended up making a
    // request anyway (stale tab, guard hadn't run yet, etc.), redirect
    // here too rather than surfacing the 423 as a generic error.
    if (
      error?.response?.status === 423 &&
      error?.response?.data?.code === "PASSWORD_CHANGE_REQUIRED"
    ) {
      if (typeof window !== "undefined" && window.location.pathname !== "/icw/change-password") {
        window.location.href = "/icw/change-password";
      }
    }

    return Promise.reject(error);
  }
);

export default api;