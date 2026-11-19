import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  FileWarning,
  RefreshCw,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/lib/api/services";
import type { DailySeriesPoint } from "@/lib/api/types";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

function DailyBarChart({
  title,
  subtitle,
  data,
  barClassName,
}: {
  title: string;
  subtitle: string;
  data: DailySeriesPoint[];
  barClassName: string;
}) {
  const maxVal = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <TrendingUp className="h-4 w-4 text-primary" />
      </div>

      {data.length === 0 ? (
        <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          No time-series data available
        </div>
      ) : (
        <div className="flex h-44 items-end gap-2.5 pt-6">
          {data.map((point) => {
            const pct = Math.max(8, Math.round((point.count / maxVal) * 100));
            const shortDate = point.date.slice(5);
            return (
              <div key={point.date} className="group flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold tabular-nums text-foreground">
                  {point.count}
                </span>
                <div className="flex h-28 w-full items-end rounded-lg bg-muted/50 p-1">
                  <div
                    className={cn(
                      "w-full rounded-md transition-all duration-300 group-hover:brightness-110",
                      barClassName,
                    )}
                    style={{ height: `${pct}%` }}
                    title={`${point.date}: ${point.count}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{shortDate}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { lang } = useApp();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminService.getOverview(),
    staleTime: 30_000,
  });

  const kpis = data
    ? [
        {
          label: lang === "ar" ? "إجمالي المستخدمين" : "Total Users",
          value: data.totalUsers,
          sub: `${data.activeUsersToday} active today · ${data.activeUsers7d} in 7d`,
          icon: Users,
          color: "text-primary bg-primary/10",
          to: "/admin/users" as const,
        },
        {
          label: lang === "ar" ? "تسجيلات جديدة (7 أيام)" : "New Signups (7d)",
          value: data.newSignups7d,
          sub: `${data.newSignupsToday} joined today`,
          icon: UserPlus,
          color: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
          to: "/admin/users" as const,
        },
        {
          label: lang === "ar" ? "نشطون (7 أيام)" : "Active Learners (7d)",
          value: data.activeUsers7d,
          sub: `${data.activeUsersToday} studied today`,
          icon: UserCheck,
          color: "text-sky-600 bg-sky-500/10 dark:text-sky-400",
          to: "/admin/users" as const,
        },
        {
          label: lang === "ar" ? "المواد الدراسية" : "Catalog Courses",
          value: data.totalCourses,
          sub: `${data.enrolledCount} active enrollments`,
          icon: BookOpen,
          color: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
          to: "/admin/courses" as const,
        },
        {
          label: lang === "ar" ? "الخطط المرفوعة اليوم" : "Uploads Today",
          value: data.uploadsToday,
          sub: "Syllabus analyses triggered today",
          icon: Upload,
          color: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
          to: "/admin/courses" as const,
        },
        {
          label: lang === "ar" ? "البلاغات المفتوحة" : "Open Reports",
          value: data.openReports,
          sub: "Pending or in-review reports",
          icon: FileWarning,
          color:
            data.openReports > 0
              ? "text-rose-600 bg-rose-500/15 dark:text-rose-400"
              : "text-emerald-600 bg-emerald-500/10",
          to: "/admin/reports" as const,
        },
        {
          label: lang === "ar" ? "تحليلات فاشلة" : "Failed Analyses",
          value: data.failedAnalyses,
          sub: "Courses needing re-analysis",
          icon: AlertTriangle,
          color:
            data.failedAnalyses > 0
              ? "text-destructive bg-destructive/15"
              : "text-muted-foreground bg-muted",
          to: "/admin/courses" as const,
        },
      ]
    : [];

  return (
    <div className="space-y-6" data-testid="admin-overview-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            {lang === "ar" ? "نظرة عامة على النظام" : "Platform Overview"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "ar"
              ? "مؤشرات الأداء اللحظية، صحة تحليل الخطط، ونشاط الطلاب."
              : "Real-time platform metrics, syllabus analysis health, and student activity."}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 rounded-xl"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          {lang === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {lang === "ar"
            ? "تعذر تحميل إحصائيات لوحة التحكم."
            : "Failed to load platform overview metrics."}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Link
                  key={kpi.label}
                  to={kpi.to}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{kpi.label}</p>
                      <p className="mt-2 text-3xl font-extrabold tabular-nums text-foreground">
                        {kpi.value.toLocaleString()}
                      </p>
                    </div>
                    <div className={cn("grid h-10 w-10 place-items-center rounded-xl", kpi.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground group-hover:text-foreground">
                    {kpi.sub}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DailyBarChart
              title={
                lang === "ar" ? "التسجيلات اليومية (آخر 7 أيام)" : "Daily Signups (Last 7 Days)"
              }
              subtitle={
                lang === "ar"
                  ? "عدد الحسابات الجديدة المسجلة يومياً"
                  : "New student accounts registered per day"
              }
              data={data.dailySignups || []}
              barClassName="bg-gradient-magic"
            />
            <DailyBarChart
              title={
                lang === "ar"
                  ? "النشاط الدراسي اليومي (آخر 7 أيام)"
                  : "Daily Study Activity (Last 7 Days)"
              }
              subtitle={
                lang === "ar"
                  ? "جلسات الدراسة المكتملة والنشاط اليومي"
                  : "Completed study sessions and active learners per day"
              }
              data={data.dailyActivity || []}
              barClassName="bg-emerald-500"
            />
          </div>
        </>
      )}
    </div>
  );
}
