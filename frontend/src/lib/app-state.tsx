import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService, gamificationService } from "./api/services";
import { getStoredAccessToken, getStoredUser, fetchApi } from "./api/client";
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
  logout: () => Promise<void>;
  refreshGamification: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
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
        setPoints(profile.currentXp);
        setStreak(profile.currentStreakDays || 1);
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
        addPoints: (n) => setPoints((p) => p + n),
        streak,
        user,
        isAuthenticated,
        isBackendOnline,
        login,
        register,
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
