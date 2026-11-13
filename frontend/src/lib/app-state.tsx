import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authService, gamificationService } from "./api/services";
import { getStoredAccessToken, getStoredUser, fetchApi } from "./api/client";
import { getUserStoragePrefix } from "./courses-util";
import type { UserSummary } from "./api/types";

type Lang = "en" | "ar";

type Ctx = {
  dark: boolean;
  toggleDark: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  points: number;
  addPoints: (n: number) => void;
  streak: number;
  user: UserSummary | null;
  isAuthenticated: boolean;
  isBackendOnline: boolean | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  loginWithOAuth: (
    provider: "google" | "microsoft",
    code?: string,
    idToken?: string,
    redirectUri?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshGamification: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [points, setPoints] = useState<number>(() => {
    try {
      const prefix = getUserStoragePrefix();
      const saved =
        localStorage.getItem(`sg-${prefix}-points`) || localStorage.getItem("sg-points");
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [streak, setStreak] = useState<number>(() => {
    try {
      const prefix = getUserStoragePrefix();
      const saved =
        localStorage.getItem(`sg-${prefix}-streak`) || localStorage.getItem("sg-streak");
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });
  const queryClient = useQueryClient();
  // Never trust role from localStorage before backend confirmation via /api/auth/me or fresh login
  const [user, setUser] = useState<UserSummary | null>(() => {
    const stored = getStoredUser();
    if (!stored) return null;
    return { ...stored, role: "STUDENT" };
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getStoredAccessToken());
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(localStorage.getItem("sg-theme") === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleDark = () =>
    setDark((d) => {
      localStorage.setItem("sg-theme", d ? "light" : "dark");
      return !d;
    });

  useEffect(() => {
    let active = true;
    fetchApi("/api/health")
      .then(() => {
        if (active) setIsBackendOnline(true);
      })
      .catch(() => {
        if (active) setIsBackendOnline(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshGamification = async () => {
    if (!getStoredAccessToken()) return;
    try {
      const prefix = getUserStoragePrefix();
      const rawPoints =
        localStorage.getItem(`sg-${prefix}-points`) || localStorage.getItem("sg-points");
      const localPoints = rawPoints !== null ? Number(rawPoints) : 0;
      const safeLocalPoints = isNaN(localPoints) ? 0 : localPoints;

      const rawStreak =
        localStorage.getItem(`sg-${prefix}-streak`) || localStorage.getItem("sg-streak");
      const localStreak = rawStreak !== null ? Number(rawStreak) : 0;
      const safeLocalStreak = isNaN(localStreak) ? 0 : localStreak;

      let profile = await gamificationService.getProfile();
      if (profile) {
        // If local storage has higher points or streak (from offline or client activities), sync to backend
        if (
          safeLocalPoints > (profile.currentXp || 0) ||
          safeLocalStreak > (profile.currentStreakDays || 0)
        ) {
          try {
            const synced = await gamificationService.syncProgress({
              points: Math.max(profile.currentXp || 0, safeLocalPoints),
              streak: Math.max(profile.currentStreakDays || 0, safeLocalStreak),
            });
            if (synced) profile = synced;
          } catch {}
        }

        const best = Math.max(profile.currentXp || 0, safeLocalPoints);

        try {
          localStorage.setItem(`sg-${prefix}-points`, String(best));
          localStorage.setItem("sg-points", String(best));
        } catch {}
        setPoints(best);

        const currentStreak = Math.max(profile.currentStreakDays || 0, safeLocalStreak, 1);
        setStreak(currentStreak);
        try {
          localStorage.setItem(`sg-${prefix}-streak`, String(currentStreak));
          localStorage.setItem("sg-streak", String(currentStreak));
        } catch {}
        setIsBackendOnline(true);
      }
    } catch (err: any) {
      if (err?.isOffline) {
        setIsBackendOnline(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    if (isAuthenticated && getStoredAccessToken()) {
      refreshGamification();
      authService
        .getMe()
        .then((me) => {
          if (active && me) {
            setUser(me);
            setIsBackendOnline(true);
            try {
              localStorage.setItem("sg_user", JSON.stringify(me));
            } catch {}
          }
        })
        .catch(() => {
          // Keep safe STUDENT role if /api/auth/me cannot be verified
        });
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleSessionCleared = () => {
      queryClient.clear();
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener("sg-session-cleared", handleSessionCleared);
    return () => {
      window.removeEventListener("sg-session-cleared", handleSessionCleared);
    };
  }, [queryClient]);

  useEffect(() => {
    const handlePointsUpdate = (e: any) => {
      try {
        if (e && typeof e.detail === "number" && !isNaN(e.detail)) {
          setPoints(e.detail);
          return;
        }
        const prefix = getUserStoragePrefix();
        const saved =
          localStorage.getItem(`sg-${prefix}-points`) || localStorage.getItem("sg-points");
        if (saved !== null) {
          const val = Number(saved);
          if (!isNaN(val)) {
            setPoints(val);
          }
        }
      } catch {}
    };
    window.addEventListener("sg-points-updated", handlePointsUpdate);
    window.addEventListener("storage", handlePointsUpdate);
    return () => {
      window.removeEventListener("sg-points-updated", handlePointsUpdate);
      window.removeEventListener("storage", handlePointsUpdate);
    };
  }, [user]);

  const allowOfflineFallback =
    !import.meta.env.PROD && import.meta.env.VITE_ENABLE_OFFLINE_MOCK === "true";

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const res = await authService.login(email, password, rememberMe);
      setUser(res.user);
      setIsAuthenticated(true);
      setIsBackendOnline(true);
      await refreshGamification();
    } catch (err: any) {
      if (err?.isOffline) {
        setIsBackendOnline(false);
        if (allowOfflineFallback) {
          const mockUser: UserSummary = {
            id: 1,
            fullName: email.split("@")[0] || "Student",
            email,
            role: "STUDENT",
            status: "ACTIVE",
          };
          setUser(mockUser);
          setIsAuthenticated(true);
          return;
        }
      }
      throw err;
    }
  };

  const register = async (fullName: string, email: string, password: string) => {
    try {
      const res = await authService.register(fullName, email, password);
      setUser(res.user);
      setIsAuthenticated(true);
      setIsBackendOnline(true);
      await refreshGamification();
    } catch (err: any) {
      if (err?.isOffline) {
        setIsBackendOnline(false);
        if (allowOfflineFallback) {
          const mockUser: UserSummary = {
            id: 1,
            fullName,
            email,
            role: "STUDENT",
            status: "ACTIVE",
          };
          setUser(mockUser);
          setIsAuthenticated(true);
          return;
        }
      }
      throw err;
    }
  };

  const loginWithOAuth = async (
    provider: "google" | "microsoft",
    code?: string,
    idToken?: string,
    redirectUri?: string,
  ) => {
    try {
      const res = await authService.oauthLogin(provider, code, idToken, redirectUri);
      setUser(res.user);
      setIsAuthenticated(true);
      setIsBackendOnline(true);
      await refreshGamification();
    } catch (err) {
      if (!isBackendOnline && allowOfflineFallback) {
        const mockUser: UserSummary = {
          id: 1,
          fullName: provider === "google" ? "Google Student" : "Windows Student",
          email: provider === "google" ? "google.student@gmail.com" : "windows.student@outlook.com",
          role: "STUDENT",
          status: "ACTIVE",
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      queryClient.clear();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AppCtx.Provider
      value={{
        dark,
        toggleDark,
        lang,
        setLang,
        points,
        addPoints: (n: number) => {
          if (!n || typeof n !== "number" || isNaN(n) || n <= 0) return;
          try {
            const prefix = getUserStoragePrefix();
            const raw =
              localStorage.getItem(`sg-${prefix}-points`) || localStorage.getItem("sg-points");
            const current = raw !== null ? Number(raw) : 0;
            const safeCurrent = isNaN(current) ? 0 : current;
            const next = safeCurrent + n;

            localStorage.setItem(`sg-${prefix}-points`, String(next));
            localStorage.setItem("sg-points", String(next));
            setPoints(next);

            window.dispatchEvent(new CustomEvent("sg-points-updated", { detail: next }));

            if (getStoredAccessToken()) {
              gamificationService.syncProgress({ points: next, streak }).catch(() => {});
            }
          } catch {
            setPoints((prev) => prev + n);
          }
        },
        streak,
        user,
        isAuthenticated,
        isBackendOnline,
        login,
        register,
        loginWithOAuth,
        logout,
        refreshGamification,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

export const themeInitScript = `try{if(localStorage.getItem('sg-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;
