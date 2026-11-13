import { type ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  FileWarning,
  Globe,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/AppShell";
import { Genie } from "@/components/Genie";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-state";
import { getStoredAccessToken } from "@/lib/api/client";
import { authService } from "@/lib/api/services";
import type { UserSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  to: "/admin/overview" | "/admin/reports" | "/admin/courses" | "/admin/users" | "/admin/audit-log";
  label: string;
  ar: string;
  icon: typeof LayoutDashboard;
  roles: Array<"ADMIN" | "MODERATOR">;
}

const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    to: "/admin/overview",
    label: "Overview",
    ar: "نظرة عامة",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    to: "/admin/reports",
    label: "Reports Inbox",
    ar: "صندوق البلاغات",
    icon: FileWarning,
    roles: ["ADMIN", "MODERATOR"],
  },
  {
    to: "/admin/courses",
    label: "Courses & Catalog",
    ar: "المواد والجامعات",
    icon: BookOpen,
    roles: ["ADMIN"],
  },
  {
    to: "/admin/users",
    label: "Users",
    ar: "المستخدمون",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    to: "/admin/audit-log",
    label: "Audit Log",
    ar: "سجل التدقيق",
    icon: Activity,
    roles: ["ADMIN"],
  },
];

export function AdminShell({
  children,
  initialAdminUser,
}: {
  children: ReactNode;
  initialAdminUser?: UserSummary | null;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, logout } = useApp();

  const hasToken = typeof window !== "undefined" ? Boolean(getStoredAccessToken()) : false;

  const {
    data: verifiedUser,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "auth", "me"],
    queryFn: () => authService.getMe(),
    initialData: initialAdminUser ?? undefined,
    enabled: typeof window !== "undefined" && hasToken,
    staleTime: 15_000,
    retry: false,
  });

  const activeRole = verifiedUser?.role;
  const isAuthorizedRole = activeRole === "ADMIN" || activeRole === "MODERATOR";
  const isModeratorRestrictedRoute =
    activeRole === "MODERATOR" && !location.pathname.startsWith("/admin/reports");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasToken) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!isLoading && (isError || !isAuthorizedRole)) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    if (!isLoading && isModeratorRestrictedRoute) {
      navigate({ to: "/admin/reports", replace: true });
    }
  }, [hasToken, isLoading, isError, isAuthorizedRole, isModeratorRestrictedRoute, navigate]);

  if (!hasToken || isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground"
        data-testid="admin-verifying-loader"
      >
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
          {lang === "ar"
            ? "جاري التحقق من صلاحيات المشرف..."
            : "Verifying administrator privileges..."}
        </p>
      </div>
    );
  }

  if (isError || !verifiedUser || !isAuthorizedRole || isModeratorRestrictedRoute) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground"
        data-testid="admin-access-denied"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">
          {lang === "ar" ? "غير مصرح بالوصول (403)" : "Access Denied (403)"}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {lang === "ar"
            ? "هذه الصفحة مخصصة للمشرفين المعتمدين فقط."
            : "This area requires backend-verified administrator permissions."}
        </p>
        <Button asChild>
          <Link to="/dashboard">{lang === "ar" ? "العودة للرئيسية" : "Return to Dashboard"}</Link>
        </Button>
      </div>
    );
  }

  const visibleNav = ADMIN_NAV_ITEMS.filter((item) =>
    item.roles.includes(activeRole as "ADMIN" | "MODERATOR"),
  );

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="flex min-h-screen flex-col bg-background text-foreground md:flex-row"
      data-testid="admin-shell"
    >
      {/* Sidebar for desktop */}
      <aside className="flex w-full flex-col border-b border-border bg-card/60 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link to="/admin/overview" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent shadow-sm">
              <Genie className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold text-gradient-magic">
                  StudyGenie
                </span>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  {verifiedUser.role}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lang === "ar" ? "لوحة التحكم والأمان" : "Security & Operations"}
              </p>
            </div>
          </Link>
        </div>

        <nav
          aria-label={lang === "ar" ? "تنقل المشرف" : "Admin Navigation"}
          className="flex gap-1.5 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-x-visible"
        >
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-primary bg-gradient-magic text-white shadow-glow"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{lang === "ar" ? item.ar : item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-border p-3 md:flex md:flex-col md:gap-2">
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span className="truncate">{verifiedUser.fullName}</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {verifiedUser.email}
            </p>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{lang === "ar" ? "العودة لتطبيق الطالب" : "Back to Student App"}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-destructive transition hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>{lang === "ar" ? "تسجيل الخروج" : "Log out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold">
              {lang === "ar" ? "مركز إدارة StudyGenie" : "StudyGenie Admin Console"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="gap-1.5 rounded-xl text-xs font-bold"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "العربية" : "English"}
            </Button>
            <ThemeToggle />
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-accent md:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {lang === "ar" ? "الطالب" : "App"}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
