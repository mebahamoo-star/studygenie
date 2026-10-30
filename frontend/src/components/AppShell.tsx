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
import { Genie } from "./Genie";
import { useApp } from "@/lib/app-state";
import { fetchAndSyncExams, loadExamsForUser, isCourseEnrolled, type Exam } from "@/lib/exam";
import { hasUserEnrolledCourses, getUserCourses } from "@/lib/courses-util";
import { cn } from "@/lib/utils";
import { CountingNumber } from "@/components/animate-ui/texts/counting-number";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

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
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    const updateExams = async () => {
      try {
        const userExams = await fetchAndSyncExams();
        setExams(userExams);
      } catch {
        setExams(loadExamsForUser());
      }
    };
    updateExams();

    const handleUpdate = () => {
      setExams(loadExamsForUser());
    };
    window.addEventListener("sg-exams-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("sg-exams-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [path]);

  // Determine overall exam ticker urgency:
  // - green: no exams within 30 days (all > 30 days or no exams)
  // - orange: any exam within 15 to 30 days
  // - red: any exam less than 15 days away
  const upcomingExamDays = exams
    .map((ex) =>
      Math.ceil(
        (new Date(ex.date + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      )
    )
    .filter((d) => d >= 0);

  const minDays = upcomingExamDays.length > 0 ? Math.min(...upcomingExamDays) : null;

  const tickerStatus: "green" | "orange" | "red" =
    minDays === null || minDays > 30
      ? "green"
      : minDays >= 15
        ? "orange"
        : "red";

  const tickerBadgeStyle =
    tickerStatus === "red"
      ? "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400"
      : tickerStatus === "orange"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";

  const tickerPointConfig =
    tickerStatus === "red"
      ? {
          pingClass: "animate-ping-fast bg-red-400 opacity-75",
          dotClass: "animate-flash-fast bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]",
          showPing: true,
        }
      : tickerStatus === "orange"
        ? {
            pingClass: "animate-ping-slow bg-amber-400 opacity-60",
            dotClass: "animate-flash-slow bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
            showPing: true,
          }
        : {
            pingClass: "",
            dotClass: "bg-emerald-500 shadow-sm",
            showPing: false,
          };

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
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="hover:bg-transparent data-[state=open]:hover:bg-transparent">
                <Link to="/dashboard" className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent shadow-sm">
                    <Genie className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
                    <span className="font-display text-base font-bold text-gradient-magic leading-none">
                      StudyGenie
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium mt-1">
                      AI Study Partner
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
              {lang === "ar" ? "التنقل" : "Navigation"}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
              {nav.map((n) => {
                const active = n.match.some((m) => path.startsWith(m));
                return (
                  <SidebarMenuItem key={n.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={lang === "ar" ? n.ar : n.label}
                      className={cn(
                        "rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        active
                          ? "bg-primary bg-gradient-magic text-white shadow-glow hover:bg-primary hover:text-white hover:brightness-105 data-[active=true]:bg-primary data-[active=true]:bg-gradient-magic data-[active=true]:text-white data-[active=true]:hover:bg-primary data-[active=true]:hover:text-white"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Link to={n.to}>
                        <n.icon className="h-5 w-5 shrink-0" />
                        <span>{lang === "ar" ? n.ar : n.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {n.to === "/plan" && inStudy && (
                      <SidebarMenuSub className="my-1.5 ml-5 border-l-2 border-sidebar-border pl-2.5">
                        {studySub.map((s) => {
                          const isLocked =
                            !hasUserEnrolledCourses() && (s.to === "/flashcards" || s.to === "/quiz");
                          const subActive = path === s.to;
                          return (
                            <SidebarMenuSubItem key={s.to}>
                              <SidebarMenuSubButton asChild isActive={subActive}>
                                <Link
                                  to={s.to}
                                  className={cn(
                                    "flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                                    subActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                                    isLocked && "opacity-70"
                                  )}
                                >
                                  <span>{s.label}</span>
                                  {isLocked && <Lock className="h-3 w-3 text-muted-foreground/80 shrink-0" />}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={path.startsWith("/settings")}
                tooltip={lang === "ar" ? "الإعدادات" : "Settings"}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  path.startsWith("/settings")
                    ? "bg-primary bg-gradient-magic text-white shadow-glow hover:bg-primary hover:text-white hover:brightness-105 data-[active=true]:bg-primary data-[active=true]:bg-gradient-magic data-[active=true]:text-white data-[active=true]:hover:bg-primary data-[active=true]:hover:text-white"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Link to="/settings">
                  <Settings className="h-5 w-5 shrink-0" />
                  <span>{lang === "ar" ? "الإعدادات" : "Settings"}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Log out"
                className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 md:px-6 backdrop-blur">
          {/* Live Exam News Ticker */}
          <div className="flex min-w-0 flex-1 items-center gap-3 mr-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-5 hidden sm:block" />

            <div className={cn("flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold shadow-sm transition-colors", tickerBadgeStyle)}>
              <span className="relative flex h-2 w-2 items-center justify-center">
                {tickerPointConfig.showPing && (
                  <span className={cn("absolute inline-flex h-full w-full rounded-full", tickerPointConfig.pingClass)}></span>
                )}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", tickerPointConfig.dotClass)}></span>
              </span>
              <span className="hidden sm:inline tracking-wider uppercase text-[10px]">
                {tickerStatus === "red" ? "EXAM TICKER · DANGER" : tickerStatus === "orange" ? "EXAM TICKER · MODERATE" : "EXAM TICKER · SAFE"}
              </span>
              <span className="sm:hidden text-[10px] tracking-wider uppercase font-extrabold">
                {tickerStatus === "red" ? "DANGER" : tickerStatus === "orange" ? "MODERATE" : "SAFE"}
              </span>
            </div>

            {exams.length > 0 ? (
              <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]">
                <div className="animate-ticker flex items-center gap-6 py-1 whitespace-nowrap">
                  {(exams.length === 1
                    ? [...exams, ...exams, ...exams, ...exams]
                    : exams.length === 2
                      ? [...exams, ...exams, ...exams]
                      : [...exams, ...exams]
                  ).map((ex, idx) => {
                    const days = Math.ceil(
                      (new Date(ex.date + "T00:00:00").getTime() - new Date().setHours(0, 0, 0, 0)) /
                        (1000 * 60 * 60 * 24)
                    );
                    return (
                      <Link
                        key={`${ex.id || ex.course}-${idx}`}
                        to="/dashboard"
                        className="group inline-flex items-center gap-2 text-xs font-medium text-foreground/90 transition hover:text-primary cursor-pointer"
                        title={`${ex.course} · ${ex.type} on ${ex.date}`}
                      >
                        <span className="font-bold text-foreground group-hover:text-primary transition">
                          {ex.course}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {ex.type}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                            days < 15
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse-soft"
                              : days <= 30
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          )}
                        >
                          {days === 0
                            ? "TODAY! 🚨"
                            : days === 1
                              ? "Tomorrow! ⚠️"
                              : days < 0
                                ? "Passed"
                                : `${days}d left`}
                        </span>
                        <span className="ml-3 text-muted-foreground/30 font-bold">✦</span>
                      </Link>
                    );
                  })}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary/80">
                    <Sparkles className="h-3 w-3 text-gold" /> Study Tip: Consistent 25-minute sprints beat all-night cramming!
                    <span className="ml-3 text-muted-foreground/30 font-bold">✦</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">All clear</span>
                <span className="hidden md:inline text-muted-foreground/50">•</span>
                <span className="hidden md:inline truncate">
                  No exams within 30 days. Add exams from Dashboard to show your live ticker!
                </span>
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isBackendOnline !== null && (
              <span
                className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isBackendOnline ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isBackendOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
                {isBackendOnline ? "API Online" : "Offline Demo"}
              </span>
            )}
            <div className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-bold shadow-soft">
              <Flame className="h-4 w-4 text-gold" /> <CountingNumber number={streak} fromNumber={0} className="tabular-nums" />
              <span className="hidden sm:inline font-normal text-muted-foreground">day streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-bold shadow-soft">
              <Star className="h-4 w-4 fill-gold text-gold" /> <CountingNumber number={points} fromNumber={0} className="tabular-nums" thousandSeparator="," />
            </div>
            <ThemeToggle />
            <Link
              to="/profile"
              className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-magic font-bold text-primary-foreground shadow-soft"
            >
              {initials}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
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
