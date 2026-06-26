import axios from "axios";
import { useAuthStore } from "../store/authStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const publicApi = axios.create({
  baseURL: BASE_URL,
});

export const privateApi = axios.create({
  baseURL: BASE_URL,
});

const getAccessToken = () => {
  const storeToken = useAuthStore.getState()?.token;
  const localToken = localStorage.getItem("token");

  return storeToken || localToken || null;
};

const getRefreshToken = () => {
  const storeRefreshToken = useAuthStore.getState()?.refreshToken;
  const localRefreshToken = localStorage.getItem("refreshToken");

  return storeRefreshToken || localRefreshToken || null;
};

const extractAccessToken = (data) => {
  return (
    data?.data?.access ||
    data?.access ||
    data?.data?.tokens?.access ||
    data?.tokens?.access ||
    null
  );
};

privateApi.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    console.log("Authorization token:", token ? "FOUND" : "NULL");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

privateApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const { setToken, logout } = useAuthStore.getState();
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      logout?.();

      return Promise.reject({
        ...error,
        response: {
          ...error.response,
          status: 401,
          data: {
            success: false,
            message: "Please login again to continue booking.",
          },
        },
      });
    }

    try {
      const res = await publicApi.post("/api/auth/token/refresh/", {
        refresh: refreshToken,
      });

      const newAccessToken = extractAccessToken(res.data);

      if (!newAccessToken) {
        throw new Error("Refresh response does not contain access token");
      }

      setToken(newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return privateApi(originalRequest);
    } catch (refreshError) {
      logout?.();

      return Promise.reject({
        ...refreshError,
        response: {
          ...refreshError.response,
          status: 401,
          data: {
            success: false,
            message: "Session expired. Please login again.",
          },
        },
      });
    }
  },
);
