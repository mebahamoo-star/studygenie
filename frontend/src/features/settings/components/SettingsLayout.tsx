import React from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  ChevronRight,
  Database,
  Loader2,
  Save,
  Sparkles,
  User,
} from "lucide-react";
import { SettingsTabs } from "./SettingsTabs";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { USE_MOCK_API } from "../api/settingsApi";
import type { SettingsTabId } from "../constants/settingsConstants";

export interface SettingsSectionItem {
  id: SettingsTabId;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

export const SETTINGS_SECTION_ITEMS: SettingsSectionItem[] = [
  { id: "profile", icon: User, colorClass: "bg-blue-100 text-blue-600" },
  { id: "study", icon: CalendarClock, colorClass: "bg-emerald-100 text-emerald-600" },
  { id: "notifications", icon: Bell, colorClass: "bg-amber-100 text-amber-600" },
  { id: "privacy", icon: Sparkles, colorClass: "bg-purple-100 text-purple-600" },
  { id: "data", icon: Database, colorClass: "bg-rose-100 text-rose-600" },
];

export interface SettingsLayoutProps {
  activeTab: SettingsTabId;
  dirtyTabs: Partial<Record<SettingsTabId, boolean>>;
  onSelectTab: (tab: SettingsTabId) => void;
  isRtl: boolean;
  children: React.ReactNode;
  // Mobile specific props
  isMobileListView?: boolean;
  onNavigateToSection?: (tab: SettingsTabId) => void;
  onNavigateBack?: () => void;
  sectionSummaries?: Record<SettingsTabId, string>;
  activeFormId?: string;
  isSaving?: boolean;
}

export function SettingsLayout({
  activeTab,
  dirtyTabs,
  onSelectTab,
  isRtl,
  children,
  isMobileListView = false,
  onNavigateToSection,
  onNavigateBack,
  sectionSummaries,
  activeFormId,
  isSaving = false,
}: SettingsLayoutProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const shouldReduceMotion = useReducedMotion();
  const isCurrentTabDirty = Boolean(dirtyTabs[activeTab]);

  const fontFamily = isRtl
    ? '"Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif'
    : '"Inter", system-ui, -apple-system, sans-serif';

  // 1. Mobile List View (/settings on <768px): iOS-settings style vertical list
  if (isMobile && isMobileListView) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        style={{ fontFamily }}
        className="min-h-screen w-full bg-[#F7F8FA] px-4 py-6 text-slate-900 pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        {/* Header */}
        <header className="mb-6 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t("page.title")}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-2xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  USE_MOCK_API ? "bg-indigo-500" : "bg-emerald-500"
                }`}
              />
              {USE_MOCK_API ? t("page.apiModeMock") : t("page.apiModeLive")}
            </span>
          </div>
          <p className="text-sm text-slate-600">{t("page.description")}</p>
        </header>

        {/* Rounded Card Group (iOS-settings style) */}
        <div className="overflow-hidden rounded-[16px] border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100">
          {SETTINGS_SECTION_ITEMS.map((sec) => {
            const Icon = sec.icon;
            const isDirty = Boolean(dirtyTabs[sec.id]);
            const summary = sectionSummaries?.[sec.id] || "";

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onNavigateToSection?.(sec.id)}
                className="flex min-h-[60px] w-full items-center justify-between p-4 text-start transition-colors duration-150 hover:bg-slate-50/80 active:bg-slate-100"
              >
                <div className="flex min-w-0 items-center gap-3.5 pe-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${sec.colorClass}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {t(`tabs.${sec.id}`)}
                      </span>
                      {isDirty && (
                        <span
                          className="h-2 w-2 rounded-full bg-amber-500"
                          title={t("page.unsavedBadge")}
                        />
                      )}
                    </div>
                    {summary && (
                      <p className="truncate text-xs text-slate-500">
                        {summary}
                      </p>
                    )}
                  </div>
                </div>

                <ChevronRight
                  className="h-5 w-5 shrink-0 text-slate-400 rtl:rotate-180"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Mobile Detail View (/settings/:section on <768px): Full screen with sticky bars & slide transition
  if (isMobile && !isMobileListView) {
    return (
      <div
        dir={isRtl ? "rtl" : "ltr"}
        style={{ fontFamily }}
        className="min-h-screen w-full bg-[#F7F8FA] text-slate-900 pb-[max(5rem,env(safe-area-inset-bottom))]"
      >
        {/* Sticky Top Bar: Back button, Section Title, Save button when dirty */}
        <header className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between border-b border-slate-200/90 bg-white/95 px-3 py-2 shadow-2xs backdrop-blur-md">
          <button
            type="button"
            onClick={onNavigateBack}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200"
            aria-label={t("common.back", "Back to settings")}
          >
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </button>

          <h2 className="mx-2 truncate text-base font-bold text-slate-900">
            {t(`tabs.${activeTab}`)}
          </h2>

          <div className="flex min-w-[44px] items-center justify-end">
            {isCurrentTabDirty ? (
              <button
                type="submit"
                form={activeFormId}
                disabled={isSaving}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>
                  {isSaving ? t("page.saving") : t("page.saveChanges", "Save")}
                </span>
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>
        </header>

        {/* Section Content with Slide Transition */}
        <motion.main
          key={activeTab}
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { x: isRtl ? -20 : 20, opacity: 0 }
          }
          animate={{ x: 0, opacity: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { x: isRtl ? 20 : -20, opacity: 0 }
          }
          transition={{ duration: 0.2, ease: "easeOut" }}
          id={`settings-tabpanel-${activeTab}`}
          role="tabpanel"
          className="space-y-6 px-3 py-4"
        >
          {children}
        </motion.main>

        {/* Sticky Bottom Save Bar for Forms (hidden when clean) */}
        {isCurrentTabDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(0,0,0,0.08)] backdrop-blur-md"
          >
            <div className="mx-auto flex max-w-[800px] items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-slate-700">
                  {t("page.unsavedBadge")}
                </span>
              </div>
              <button
                type="submit"
                form={activeFormId}
                disabled={isSaving}
                className="inline-flex min-h-[44px] min-w-[130px] items-center justify-center gap-2 rounded-[12px] bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>
                  {isSaving ? t("page.saving") : t("page.saveChanges")}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // 3. Desktop Layout (>=768px): Header + Horizontal Tabs + Stacked Cards
  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{ fontFamily }}
      className="min-h-screen w-full rounded-[20px] bg-[#F7F8FA] px-3 py-6 text-slate-900 sm:px-6 lg:px-8"
    >
      {/* Top Header: Centered max-width ~800px */}
      <header className="mx-auto mb-3 flex w-full max-w-[800px] flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t("page.title")}
            </h1>
            {isCurrentTabDirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t("page.unsavedBadge")}
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            {t("page.description")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-2xs">
            <span
              className={`h-2 w-2 rounded-full ${
                USE_MOCK_API ? "bg-indigo-500" : "bg-emerald-500"
              }`}
            />
            {USE_MOCK_API ? t("page.apiModeMock") : t("page.apiModeLive")}
          </span>
        </div>
      </header>

      {/* Sticky Horizontal Tab Bar (5 tabs) - hidden on mobile */}
      <SettingsTabs
        activeTab={activeTab}
        dirtyTabs={dirtyTabs}
        onSelectTab={onSelectTab}
        isRtl={isRtl}
      />

      {/* Centered Content Area: max-width ~800px, stacked Cards */}
      <div
        id={`settings-tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeTab}`}
        className="mx-auto w-full max-w-[800px] space-y-6 pb-8"
      >
        {children}
      </div>
    </div>
  );
}
