import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearAuthSession, getApiBaseUrl, getStoredAccessToken } from "@/lib/api/client";

export interface ApiFieldErrorResponse {
  message?: string;
  errors?: Record<string, string | string[]>;
  fieldErrors?: Record<string, string>;
}

export interface NormalizedApiError extends Error {
  status?: number | undefined;
  fieldErrors?: Record<string, string> | undefined;
}

export const settingsAxiosClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT in Authorization header
settingsAxiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 redirect to /login and 400/422 field error normalization
settingsAxiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFieldErrorResponse>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      clearAuthSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    const normalizedError: NormalizedApiError = new Error(
      data?.message || error.message || "An unexpected error occurred"
    );
    normalizedError.status = status;

    if (status === 400 || status === 422) {
      const mappedFields: Record<string, string> = {};
      if (data?.fieldErrors && typeof data.fieldErrors === "object") {
        Object.entries(data.fieldErrors).forEach(([field, msg]) => {
          if (typeof msg === "string") mappedFields[field] = msg;
        });
      }
      if (data?.errors && typeof data.errors === "object") {
        Object.entries(data.errors).forEach(([field, msg]) => {
          if (Array.isArray(msg) && msg.length > 0) {
            mappedFields[field] = String(msg[0]);
          } else if (typeof msg === "string") {
            mappedFields[field] = msg;
          }
        });
      }
      if (Object.keys(mappedFields).length > 0) {
        normalizedError.fieldErrors = mappedFields;
      }
    }

    return Promise.reject(normalizedError);
  }
);
