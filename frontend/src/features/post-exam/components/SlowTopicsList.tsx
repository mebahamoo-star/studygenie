import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock } from "lucide-react";
import type { SlowTopicItem } from "../constants/postExamConstants";

const PERCENT_MAX = 100;

export interface SlowTopicsListProps {
  slowTopics: SlowTopicItem[];
}

export function SlowTopicsList({ slowTopics }: SlowTopicsListProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t("postExam.report.slowTopicsTitle")}
      className="rounded-[16px] border border-slate-200 bg-white p-5 sm:p-6 shadow-xs text-start"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
          <Clock className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-base font-bold text-slate-900">
          {t("postExam.report.slowTopicsTitle")}
        </h2>
      </div>

      {slowTopics.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-[12px] border border-slate-100 bg-slate-50 px-4 py-5 text-sm text-slate-600">
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-indigo-600"
            aria-hidden="true"
          />
          <span>{t("postExam.report.slowTopicsEmpty")}</span>
        </div>
      ) : (
        <ul className="space-y-4">
          {slowTopics.map((topic) => {
            const maxMinutes = Math.max(
              1,
              topic.actualMinutes,
              topic.plannedMinutes
            );
            const plannedPercent = Math.round(
              (topic.plannedMinutes / maxMinutes) * PERCENT_MAX
            );
            const actualPercent = Math.round(
              (topic.actualMinutes / maxMinutes) * PERCENT_MAX
            );

            return (
              <li
                key={topic.topicId}
                className="rounded-[12px] border border-slate-100 bg-slate-50/70 p-3.5"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    {topic.title}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-slate-600">
                    {t("postExam.report.topicTimeRatio", {
                      actual: topic.actualMinutes,
                      planned: topic.plannedMinutes,
                    })}
                  </span>
                </div>

                {/* Small progress bar comparing planned marker vs actual */}
                <div
                  role="progressbar"
                  aria-label={topic.title}
                  aria-valuenow={topic.actualMinutes}
                  aria-valuemin={0}
                  aria-valuemax={maxMinutes}
                  className="relative mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all"
                    style={{ width: `${actualPercent}%` }}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 w-0.5 bg-slate-900/40"
                    style={{ insetInlineStart: `${plannedPercent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
