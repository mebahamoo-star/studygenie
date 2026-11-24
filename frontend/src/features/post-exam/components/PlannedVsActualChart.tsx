import React from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMediaQuery } from "@/features/settings/hooks/useMediaQuery";
import {
  MOBILE_BREAKPOINT_QUERY,
  type WeeklyHoursPoint,
} from "../constants/postExamConstants";

const DESKTOP_CHART_HEIGHT_PX = 280;
const MOBILE_CHART_HEIGHT_PX = 220;
const BAR_RADIUS = 6;
const BAR_MAX_SIZE_MOBILE = 20;
const BAR_MAX_SIZE_DESKTOP = 32;

export interface PlannedVsActualChartProps {
  weekly: WeeklyHoursPoint[];
}

export function PlannedVsActualChart({ weekly }: PlannedVsActualChartProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const isArabic = i18n.language === "ar";
  const chartHeight = isMobile
    ? MOBILE_CHART_HEIGHT_PX
    : DESKTOP_CHART_HEIGHT_PX;

  return (
    <section
      aria-label={t("postExam.report.chartTitle")}
      className="rounded-[16px] border border-slate-200 bg-white p-5 sm:p-6 shadow-xs"
    >
      <div className="mb-4 text-start">
        <h2 className="text-base font-bold text-slate-900">
          {t("postExam.report.chartTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {t("postExam.report.chartSubtitle")}
        </p>
      </div>

      <div style={{ width: "100%", height: chartHeight }} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weekly}
            margin={
              isMobile
                ? { top: 8, right: 8, left: -16, bottom: 4 }
                : { top: 8, right: 16, left: 0, bottom: 8 }
            }
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />
            <XAxis
              dataKey="weekLabel"
              reversed={isArabic}
              tick={{ fill: "#475569", fontSize: isMobile ? 11 : 12 }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
            />
            <YAxis
              orientation={isArabic ? "right" : "left"}
              tick={{ fill: "#475569", fontSize: isMobile ? 11 : 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E2E8F0",
                borderRadius: "12px",
                color: "#0F172A",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
            <Bar
              dataKey="plannedHours"
              name={t("postExam.report.plannedSeries")}
              fill="#C7D2FE"
              radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
              maxBarSize={isMobile ? BAR_MAX_SIZE_MOBILE : BAR_MAX_SIZE_DESKTOP}
            />
            <Bar
              dataKey="actualHours"
              name={t("postExam.report.actualSeries")}
              fill="#4F46E5"
              radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
              maxBarSize={isMobile ? BAR_MAX_SIZE_MOBILE : BAR_MAX_SIZE_DESKTOP}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader & DOM-accessible breakdown */}
      <table className="sr-only">
        <caption>{t("postExam.report.chartTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">{t("postExam.report.plannedSeries")}</th>
            <th scope="col">{t("postExam.report.actualSeries")}</th>
          </tr>
        </thead>
        <tbody>
          {weekly.map((point) => (
            <tr key={point.weekLabel}>
              <td>{point.weekLabel}</td>
              <td>{point.plannedHours}</td>
              <td>{point.actualHours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
