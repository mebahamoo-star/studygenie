import type { ApiResponse, AuthResponse, UserSummary } from "./types";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // When accessed from another device on the local network (e.g. mobile phone, tablet, laptop)
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8080`;
    }
  }
  return (import.meta.env["VITE_API_URL"] as string) || "http://localhost:8080";
}

export const API_BASE_URL = getApiBaseUrl();

const STORAGE_KEYS = {
  ACCESS_TOKEN: "sg_access_token",
  REFRESH_TOKEN: "sg_refresh_token",
  USER: "sg_user",
};

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export function getStoredUser(): UserSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(auth: AuthResponse) {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, auth.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, auth.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(auth.user));
  } catch (err) {
    console.error("Failed to save auth session to localStorage", err);
  }
}

export function clearAuthSession() {
  try {
    const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
    let prefix = "guest";
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u?.id) prefix = `u${u.id}`;
        else if (u?.email) prefix = `u_${u.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
      } catch {}
    }

    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);

    // Purge user-specific active session state
    localStorage.removeItem(`sg-${prefix}-exams`);
    localStorage.removeItem(`sg-${prefix}-exam`);
    localStorage.removeItem(`sg-${prefix}-active-course`);
    localStorage.removeItem(`sg-${prefix}-active-plan`);
    localStorage.removeItem(`sg-${prefix}-active-cards`);

    // Purge legacy un-scoped cache so new users start completely fresh
    localStorage.removeItem("sg-user-courses");
    localStorage.removeItem("sg-active-cards");
    localStorage.removeItem("sg-active-plan");
    localStorage.removeItem("sg-active-course");
    localStorage.removeItem("sg-task-kits");
    localStorage.removeItem("sg-exams");
    localStorage.removeItem("sg-exam");
  } catch (err) {
    console.error("Failed to clear auth session", err);
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function onTokenRefreshed(newToken: string | null) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push((token) => resolve(token));
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuthSession();
      onTokenRefreshed(null);
      return null;
    }

    const payload: ApiResponse<AuthResponse> = await res.json();
    if (payload.success && payload.data?.accessToken) {
      saveAuthSession(payload.data);
      onTokenRefreshed(payload.data.accessToken);
      return payload.data.accessToken;
    }

    clearAuthSession();
    onTokenRefreshed(null);
    return null;
  } catch (err) {
    clearAuthSession();
    onTokenRefreshed(null);
    return null;
  } finally {
    isRefreshing = false;
  }
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Append JSON content type if body is not FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Append Bearer token if present
  let token = getStoredAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkError) {
    // Backend unreachable / network down
    const err = new Error("BACKEND_OFFLINE");
    (err as any).isOffline = true;
    throw err;
  }

  // Handle 401 Unauthorized by attempting a token refresh
  if (response.status === 401 && !endpoint.includes("/api/auth/")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      try {
        response = await fetch(url, { ...options, headers });
      } catch (retryError) {
        const err = new Error("BACKEND_OFFLINE");
        (err as any).isOffline = true;
        throw err;
      }
    }
  }

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new Error(`Failed to parse response: ${response.status} ${response.statusText}`);
  }

  if (!response.ok || json.success === false) {
    const message = json.message || `Request failed with status ${response.status}`;
    const err = new Error(message);
    (err as any).status = response.status;
    (err as any).data = json;
    throw err;
  }

  return json;
}
