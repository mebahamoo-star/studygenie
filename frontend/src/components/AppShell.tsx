import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BookOpen,
  Brain,
  Flame,
  Home,
  Lock,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Star,
  Sun,
  Trophy,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { GenieLogo } from "./Genie";
import { useApp } from "@/lib/app-state";
import { loadExamsForUser, type Exam } from "@/lib/exam";
import { getUserCourses, hasUserEnrolledCourses } from "@/lib/courses-util";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Home", ar: "الرئيسية", icon: Home, match: ["/dashboard"] },
  { to: "/courses", label: "My Courses", ar: "موادي", icon: BookOpen, match: ["/courses"] },
  { to: "/plan", label: "Study", ar: "الدراسة", icon: Brain, match: ["/plan", "/pomodoro", "/flashcards", "/quiz"] },
  { to: "/leaderboard", label: "Leaderboard", ar: "المتصدرون", icon: Trophy, match: ["/leaderboard"] },
  { to: "/profile", label: "Profile", ar: "الملف", icon: User, match: ["/profile"] },
] as const;

const studySub = [
  { to: "/plan", label: "Study plan" },
  { to: "/pomodoro", label: "Pomodoro" },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/quiz", label: "Quiz" },
] as const;

export function ThemeToggle() {
  let appState: ReturnType<typeof useApp> | null = null;
  try {
    appState = useApp();
  } catch {
    // Graceful fallback if rendered during initial route mounting or error boundary
  }
  const [localDark, setLocalDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sg-theme") === "dark";
    }
    return false;
  });

  const dark = appState ? appState.dark : localDark;
  const toggleDark = () => {
    if (appState) {
      appState.toggleDark();
    } else {
      const next = !localDark;
      setLocalDark(next);
      if (typeof window !== "undefined") {
        localStorage.setItem("sg-theme", next ? "dark" : "light");
        document.documentElement.classList.toggle("dark", next);
      }
    }
  };

  return (
    <button
      onClick={toggleDark}
      aria-label="Toggle Focus Mode"
      className="grid h-10 w-10 place-items-center rounded-xl bg-card text-foreground shadow-soft transition hover:scale-105"
    >
      {dark ? <Sun className="h-5 w-5 text-gold" /> : <Moon className="h-5 w-5 text-primary" />}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { points, streak, lang, user, isBackendOnline, logout } = useApp();
  const inStudy = studySub.some((s) => path.startsWith(s.to));
  const [exam, setExam] = useState<Exam | null>(null);

  useEffect(() => {
    const enrolled = getUserCourses();
    if (enrolled.length === 0) {
      setExam(null);
      return;
    }
    const userExams = loadExamsForUser(enrolled);
    setExam(userExams.length > 0 ? userExams[0] : null);
  }, [path]);

  const todayDateStr = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const daysLeft = exam?.date
    ? Math.ceil((new Date(exam.date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
    : null;

  const initials = (user?.fullName || "Scholar")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4">
        <Link to="/dashboard" className="mb-8 px-2 pt-1">
          <GenieLogo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => {
            const active = n.match.some((m) => path.startsWith(m));
            return (
              <div key={n.to}>
                <Link
                  to={n.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    active
                      ? "bg-gradient-magic text-primary-foreground shadow-glow"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <n.icon className="h-5 w-5" />
                  {lang === "ar" ? n.ar : n.label}
                </Link>
                {n.to === "/plan" && inStudy && (
                  <div className="ml-6 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                    {studySub.map((s) => {
                      const isLocked = !hasUserEnrolledCourses() && (s.to === "/flashcards" || s.to === "/quiz");
                      return (
                        <Link
                          key={s.to}
                          to={s.to}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground",
                            isLocked && "opacity-70"
                          )}
                          activeProps={{ className: "text-primary" }}
                        >
                          <span>{s.label}</span>
                          {isLocked && <Lock className="h-3 w-3 text-muted-foreground/80" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          >
            <Settings className="h-5 w-5" /> {lang === "ar" ? "الإعدادات" : "Settings"}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" /> Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-3 border-b bg-background/80 px-8 backdrop-blur">
          <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> {todayDateStr}
            {hasUserEnrolledCourses() && exam && daysLeft !== null && daysLeft >= 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {exam.course} · {exam.type} in {daysLeft} {daysLeft === 1 ? "day" : "days"}
              </span>
            )}
          </div>
          {isBackendOnline !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isBackendOnline ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isBackendOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isBackendOnline ? "API Online" : "Offline Demo"}
            </span>
          )}
          <div className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-bold shadow-soft">
            <Flame className="h-4 w-4 text-gold" /> {streak}
            <span className="font-normal text-muted-foreground">day streak</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-bold shadow-soft">
            <Star className="h-4 w-4 fill-gold text-gold" /> {points.toLocaleString()}
          </div>
          <ThemeToggle />
          <Link
            to="/profile"
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-magic font-bold text-primary-foreground shadow-soft"
          >
            {initials}
          </Link>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6 text-card-foreground shadow-soft", className)}>
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
