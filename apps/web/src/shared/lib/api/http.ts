import axios, { type InternalAxiosRequestConfig } from "axios";

const API_BASE_PATH = "/api/v1";
const isBrowser = typeof window !== "undefined";
const backendUrl = process.env.NEXT_PUBLIC_URL_BACKEND;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
  requestSentAt?: number;
};

const http = axios.create({
  baseURL: isBrowser ? API_BASE_PATH : backendUrl,
  timeout: 15000,
  withCredentials: true,
});

export const refreshClient = axios.create({
  baseURL: isBrowser ? API_BASE_PATH : backendUrl,
  timeout: 45000,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;
let lastSuccessfulRefreshAt = 0;

const refreshAccessToken = () => {
  refreshPromise ??= refreshClient
    .post("/auth/refresh")
    .then(() => {
      lastSuccessfulRefreshAt = Date.now();
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const shouldSkipAuthRefresh = (config: RetryableRequestConfig) =>
  config.skipAuthRefresh ||
  ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some(
    (path) => config.url?.includes(path),
  );

http.interceptors.request.use((config) => {
  (config as RetryableRequestConfig).requestSentAt = Date.now();
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (error.response?.status === 429 && isBrowser) {
      const { toast } = await import("react-toastify");
      toast.error(
        error.response?.data?.message ||
          "คุณส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง (Too Many Requests)",
      );
      throw error;
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipAuthRefresh(originalRequest)
    ) {
      originalRequest._retry = true;

      if (
        originalRequest.requestSentAt &&
        originalRequest.requestSentAt < lastSuccessfulRefreshAt
      ) {
        return http(originalRequest);
      }

      try {
        await refreshAccessToken();
        return http(originalRequest);
      } catch (refreshError) {
        if (
          isBrowser &&
          axios.isAxiosError(refreshError) &&
          refreshError.response?.status === 401
        ) {
          window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
        throw refreshError;
      }
    }

    throw error;
  },
);

export default http;
