import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: "google" | "microsoft", code?: string, idToken?: string, redirectUri?: string) => Promise<void>;
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
        localStorage.getItem(`sg-${prefix}-points`) ||
        localStorage.getItem("sg-points");
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });
  const [streak, setStreak] = useState<number>(() => {
    try {
      const prefix = getUserStoragePrefix();
      const saved =
        localStorage.getItem(`sg-${prefix}-streak`) ||
        localStorage.getItem("sg-streak");
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [user, setUser] = useState<UserSummary | null>(() => getStoredUser());
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
      const profile = await gamificationService.getProfile();
      if (profile) {
        const prefix = getUserStoragePrefix();
        const raw =
          localStorage.getItem(`sg-${prefix}-points`) ||
          localStorage.getItem("sg-points");
        const currentLocal = raw !== null ? Number(raw) : 0;
        const safeLocal = isNaN(currentLocal) ? 0 : currentLocal;
        const best = Math.max(profile.currentXp || 0, safeLocal);

        try {
          localStorage.setItem(`sg-${prefix}-points`, String(best));
          localStorage.setItem("sg-points", String(best));
        } catch {}
        setPoints(best);

        const currentStreak = profile.currentStreakDays || 1;
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
    if (isAuthenticated) {
      refreshGamification();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handlePointsUpdate = (e: any) => {
      try {
        if (e && typeof e.detail === "number" && !isNaN(e.detail)) {
          setPoints(e.detail);
          return;
        }
        const prefix = getUserStoragePrefix();
        const saved =
          localStorage.getItem(`sg-${prefix}-points`) ||
          localStorage.getItem("sg-points");
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

  const login = async (email: string, password: string) => {
    try {
      const res = await authService.login(email, password);
      setUser(res.user);
      setIsAuthenticated(true);
      setIsBackendOnline(true);
      await refreshGamification();
    } catch (err: any) {
      if (err?.isOffline) {
        setIsBackendOnline(false);
        // Fallback for demo when backend is offline
        const mockUser: UserSummary = {
          id: 1,
          fullName: email.split("@")[0] || "Mohammad Hammoo",
          email,
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        return;
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
        const mockUser: UserSummary = {
          id: 1,
          fullName,
          email,
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        return;
      }
      throw err;
    }
  };

  const loginWithOAuth = async (provider: "google" | "microsoft", code?: string, idToken?: string, redirectUri?: string) => {
    try {
      const res = await authService.oauthLogin(provider, code, idToken, redirectUri);
      setUser(res.user);
      setIsAuthenticated(true);
      await refreshGamification();
    } catch (err) {
      if (!isBackendOnline) {
        const mockUser: UserSummary = {
          id: 1,
          fullName: provider === "google" ? "Google Student" : "Windows Student",
          email: provider === "google" ? "google.student@gmail.com" : "windows.student@outlook.com",
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
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
              localStorage.getItem(`sg-${prefix}-points`) ||
              localStorage.getItem("sg-points");
            const current = raw !== null ? Number(raw) : 0;
            const safeCurrent = isNaN(current) ? 0 : current;
            const next = safeCurrent + n;

            localStorage.setItem(`sg-${prefix}-points`, String(next));
            localStorage.setItem("sg-points", String(next));
            setPoints(next);

            window.dispatchEvent(new CustomEvent("sg-points-updated", { detail: next }));
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
