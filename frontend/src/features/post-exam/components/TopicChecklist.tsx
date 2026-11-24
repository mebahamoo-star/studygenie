import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, BookOpen, Search, Sparkles } from "lucide-react";
import {
  TOPIC_SEARCH_THRESHOLD,
  type SyllabusTopicItem,
} from "../constants/postExamConstants";

export interface TopicChecklistProps {
  topics: SyllabusTopicItem[];
  hardTopicIds: number[];
  testedTopicIds: number[];
  onToggleHard: (topicId: number) => void;
  onToggleTested: (topicId: number) => void;
}

export function TopicChecklist({
  topics,
  hardTopicIds,
  testedTopicIds,
  onToggleHard,
  onToggleTested,
}: TopicChecklistProps) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const isArabic = i18n.language === "ar";
  const showSearch = topics.length > TOPIC_SEARCH_THRESHOLD;

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((topic) => {
      const enTitle = topic.title.toLowerCase();
      const arTitle = (topic.titleAr || "").toLowerCase();
      return enTitle.includes(q) || arTitle.includes(q);
    });
  }, [topics, searchQuery]);

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-10 text-center">
        <BookOpen className="h-8 w-8 text-slate-400" aria-hidden="true" />
        <p className="mt-2 text-sm font-semibold text-slate-800">
          {t("postExam.feedback.noTopicsInCourse")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="relative">
          <label htmlFor="post-exam-topic-search" className="sr-only">
            {t("postExam.feedback.topicSearchLabel")}
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="post-exam-topic-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("postExam.feedback.topicSearchPlaceholder")}
            className="min-h-[44px] w-full rounded-[12px] border border-slate-200 bg-white ps-10 pe-4 py-2 text-base text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
          />
        </div>
      )}

      {filteredTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-800">
            {t("postExam.feedback.noTopicsTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t("postExam.feedback.noTopicsSubtitle")}
          </p>
        </div>
      ) : (
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-[16px] border border-slate-200 bg-white">
          {filteredTopics.map((topic) => {
            const label = isArabic && topic.titleAr ? topic.titleAr : topic.title;
            const isHard = hardTopicIds.includes(topic.id);
            const isTested = testedTopicIds.includes(topic.id);

            return (
              <li
                key={topic.id}
                className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-slate-900 text-start">
                  {label}
                </span>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-pressed={isHard}
                    onClick={() => onToggleHard(topic.id)}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${
                      isHard
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("postExam.feedback.hardestLabel")}
                  </button>

                  <button
                    type="button"
                    aria-pressed={isTested}
                    onClick={() => onToggleTested(topic.id)}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${
                      isTested
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("postExam.feedback.testedLabel")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
