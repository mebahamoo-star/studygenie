import React, { useCallback, useEffect, useMemo, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import settingsI18n, { setSettingsLanguage } from "./i18n";
import { SettingsLayout } from "./components/SettingsLayout";
import { SettingsSkeletonLoader } from "./components/SkeletonLoader";
import { ConfirmModal } from "./components/ConfirmModal";
import { ToastContainer, type ToastMessage } from "./components/Toast";
import { ProfileSection } from "./sections/ProfileSection";
import { SecuritySection } from "./sections/SecuritySection";
import { StudyPreferencesSection } from "./sections/StudyPreferencesSection";
import { NotificationsSection } from "./sections/NotificationsSection";
import { PrivacySection } from "./sections/PrivacySection";
import { CoursesSection } from "./sections/CoursesSection";
import { LanguageSection } from "./sections/LanguageSection";
import { DataSection } from "./sections/DataSection";
import { useSettings } from "./hooks/useSettings";
import { useAutoSave } from "./hooks/useAutoSave";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useApp } from "@/lib/app-state";
import {
  parseSettingsTabFromUrl,
  VALID_SETTINGS_TABS,
  type AvailabilityBlock,
  type LanguageRegionSettings,
  type NotificationSettings,
  type PrivacyGamificationSettings,
  type ProfileSettings,
  type SectionId,
  type SettingsTabId,
  type StudyPreferencesSettings,
} from "./constants/settingsConstants";

const TAB_SECTIONS_MAP: Record<SettingsTabId, SectionId[]> = {
  profile: ["profile", "security"],
  study: ["studyPreferences", "courses"],
  notifications: ["notifications"],
  privacy: ["privacy", "language"],
  data: ["data"],
};

export interface SettingsPageProps {
  initialTab?: SettingsTabId | undefined;
}

function SettingsPageContent({ initialTab }: SettingsPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 767px)");

  let appCtx: ReturnType<typeof useApp> | null = null;
  try {
    appCtx = useApp();
  } catch {
    appCtx = null;
  }

  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    if (initialTab && VALID_SETTINGS_TABS.includes(initialTab)) {
      return initialTab;
    }
    if (typeof window !== "undefined") {
      return parseSettingsTabFromUrl(window.location.pathname);
    }
    return "study";
  });

  const [isMobileListView, setIsMobileListView] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const path = window.location.pathname;
    return path === "/settings" || path === "/settings/";
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pendingTabTarget, setPendingTabTarget] =
    useState<SettingsTabId | null>(null);
  const [pendingBackModal, setPendingBackModal] = useState<boolean>(false);

  const {
    settings,
    courses,
    isLoading,
    error,
    refresh,
    setOptimisticSettings,
    savePartialSettings,
    saveAvailability,
    updateCourseExamDate,
    leaveCourseChallenge,
    deleteUploadedPdf,
  } = useSettings();

  const { dirtySections, setSectionDirty } = useUnsavedChanges();

  // Compute dirty state per top-level tab
  const dirtyTabs = useMemo<Partial<Record<SettingsTabId, boolean>>>(() => {
    const result: Partial<Record<SettingsTabId, boolean>> = {};
    for (const tabId of VALID_SETTINGS_TABS) {
      const childSections = TAB_SECTIONS_MAP[tabId];
      result[tabId] = childSections.some((sec) => Boolean(dirtySections[sec]));
    }
    return result;
  }, [dirtySections]);

  // Sync URL with activeTab and mobile list vs detail view
  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentPath = window.location.pathname;
    if (isMobile) {
      if (currentPath === "/settings" || currentPath === "/settings/") {
        setIsMobileListView(true);
      } else {
        setIsMobileListView(false);
        const tabFromUrl = parseSettingsTabFromUrl(currentPath);
        setActiveTab(tabFromUrl);
      }
    } else {
      setIsMobileListView(false);
      if (currentPath === "/settings" || currentPath === "/settings/") {
        const targetUrl = `/settings/${activeTab}`;
        window.history.replaceState(null, "", targetUrl);
      }
    }

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/settings" || path === "/settings/") {
        setIsMobileListView(true);
      } else {
        setIsMobileListView(false);
        const tabFromUrl = parseSettingsTabFromUrl(path);
        setActiveTab(tabFromUrl);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMobile, activeTab]);

  useEffect(() => {
    if (initialTab && VALID_SETTINGS_TABS.includes(initialTab)) {
      setActiveTab(initialTab);
      setIsMobileListView(false);
    }
  }, [initialTab]);

  const applyTabNavigation = useCallback((nextTab: SettingsTabId) => {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      const targetUrl = `/settings/${nextTab}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, "", targetUrl);
      }
    }
  }, []);

  const handleSelectTab = (nextTab: SettingsTabId) => {
    if (nextTab === activeTab) return;
    if (dirtyTabs[activeTab]) {
      setPendingTabTarget(nextTab);
    } else {
      applyTabNavigation(nextTab);
    }
  };

  const handleMobileNavigateToSection = (nextTab: SettingsTabId) => {
    setActiveTab(nextTab);
    setIsMobileListView(false);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/settings/${nextTab}`);
    }
  };

  const handleMobileNavigateBack = () => {
    if (dirtyTabs[activeTab]) {
      setPendingBackModal(true);
    } else {
      setIsMobileListView(true);
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", "/settings");
      }
    }
  };

  const handleConfirmDiscardTabChanges = () => {
    const sectionsToClear = TAB_SECTIONS_MAP[activeTab];
    sectionsToClear.forEach((sec) => setSectionDirty(sec, false));
    if (pendingTabTarget) {
      applyTabNavigation(pendingTabTarget);
    }
    setPendingTabTarget(null);
  };

  const handleConfirmDiscardBack = () => {
    const sectionsToClear = TAB_SECTIONS_MAP[activeTab];
    sectionsToClear.forEach((sec) => setSectionDirty(sec, false));
    setIsMobileListView(true);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/settings");
    }
    setPendingBackModal(false);
  };

  const pushToast = useCallback((type: "success" | "error", message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const { triggerAutoSave } = useAutoSave({
    settings,
    setOptimisticSettings,
    savePartialSettings,
    onSuccessToast: (msg) => pushToast("success", msg || t("toasts.autoSaved")),
    onErrorToast: (msg) => pushToast("error", msg || t("toasts.saveError")),
  });

  // Synchronize initial language between StudyGenie AppContext and settings i18n
  useEffect(() => {
    if (appCtx?.lang) {
      setSettingsLanguage(appCtx.lang);
    } else if (settings?.languageRegion.language) {
      setSettingsLanguage(settings.languageRegion.language);
    }
  }, [appCtx?.lang, settings?.languageRegion.language]);

  const activeLanguage: "en" | "ar" =
    appCtx?.lang || settings?.languageRegion.language || "en";
  const isRtl = activeLanguage === "ar";

  const handleSaveProfile = async (updatedProfile: ProfileSettings) => {
    await savePartialSettings({ profile: updatedProfile });
  };

  const handleSaveStudyPreferences = async (
    prefs: StudyPreferencesSettings,
    slots: AvailabilityBlock[]
  ) => {
    await Promise.all([
      savePartialSettings({ studyPreferences: prefs }),
      saveAvailability(slots),
    ]);
  };

  const handleAutoSaveNotification = (
    partial: Partial<NotificationSettings>,
    fieldKey: string
  ) => {
    triggerAutoSave("notifications", partial, fieldKey);
  };

  const handleAutoSavePrivacy = (
    partial: Partial<PrivacyGamificationSettings>,
    fieldKey: string
  ) => {
    triggerAutoSave("privacy", partial, fieldKey);
  };

  const handleAutoSaveLanguageRegion = (
    partial: Partial<LanguageRegionSettings>,
    fieldKey: string
  ) => {
    triggerAutoSave("languageRegion", partial, fieldKey);
  };

  const handleLanguageChange = (nextLang: "en" | "ar") => {
    setSettingsLanguage(nextLang);
    if (appCtx?.setLang) {
      appCtx.setLang(nextLang);
    }
    triggerAutoSave("languageRegion", { language: nextLang }, "language");
  };

  const handleAccountDeleted = async () => {
    if (appCtx?.logout) {
      await appCtx.logout();
    }
    navigate({ to: "/login" });
  };

  // Calculate live weekly availability hours for section summary
  const totalWeeklyHours = useMemo(() => {
    if (!settings?.availability) return 0;
    let count = 0;
    for (const b of settings.availability) {
      const start = parseInt(b.startTime.split(":")[0] ?? "", 10);
      const end = parseInt(b.endTime.split(":")[0] ?? "", 10);
      if (!isNaN(start) && !isNaN(end) && end > start) {
        count += end - start;
      } else if (!isNaN(start)) {
        count += 1;
      }
    }
    return count;
  }, [settings?.availability]);

  const activeChannelsCount = useMemo(() => {
    if (!settings?.notifications?.channels) return 0;
    return Object.values(settings.notifications.channels).filter(Boolean).length;
  }, [settings?.notifications?.channels]);

  const sectionSummaries = useMemo<Record<SettingsTabId, string>>(() => {
    return {
      profile: settings?.profile?.displayName
        ? `${settings.profile.displayName} • ${settings.profile.email || "Verified"}`
        : t("profile.cardDescription"),
      study: `${totalWeeklyHours} hrs/week available`,
      notifications: `${activeChannelsCount} channels active • Quiet hours ${
        settings?.notifications?.quietHours?.enabled ? "on" : "off"
      }`,
      privacy: `${activeLanguage === "ar" ? "العربية" : "English"} • ${
        settings?.privacy?.publicProfile ? "Public on leaderboard" : "Private mode"
      }`,
      data: `${settings?.pdfs?.length ?? 0} uploaded files • Export & reset`,
    };
  }, [
    settings,
    totalWeeklyHours,
    activeChannelsCount,
    activeLanguage,
    t,
  ]);

  const activeFormId = useMemo(() => {
    if (activeTab === "profile") return "profile-form";
    if (activeTab === "study") return "study-preferences-form";
    return undefined;
  }, [activeTab]);

  const renderActiveTabContent = () => {
    if (isLoading || !settings) {
      return <SettingsSkeletonLoader />;
    }

    if (error) {
      return (
        <div
          role="alert"
          className="rounded-[16px] border border-red-200 bg-white p-6 text-center"
        >
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 rounded-[12px] bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <ProfileSection
              profile={settings.profile}
              isRtl={isRtl}
              onSaveProfile={handleSaveProfile}
              onDirtyChange={setSectionDirty}
              onShowToast={pushToast}
            />
            <SecuritySection
              onDirtyChange={setSectionDirty}
              onShowToast={pushToast}
            />
          </div>
        );

      case "study":
        return (
          <div className="space-y-6">
            <StudyPreferencesSection
              studyPreferences={settings.studyPreferences}
              availability={settings.availability}
              timeFormat={settings.languageRegion.timeFormat}
              firstDayOfWeek={settings.languageRegion.firstDayOfWeek}
              onSaveStudyPreferences={handleSaveStudyPreferences}
              onDirtyChange={setSectionDirty}
              onShowToast={pushToast}
            />
            <CoursesSection
              courses={courses}
              onUpdateExamDate={async (courseId, examDate) => {
                await updateCourseExamDate(courseId, examDate);
              }}
              onLeaveChallenge={leaveCourseChallenge}
              onShowToast={pushToast}
            />
          </div>
        );

      case "notifications":
        return (
          <NotificationsSection
            notifications={settings.notifications}
            onAutoSaveNotification={handleAutoSaveNotification}
          />
        );

      case "privacy":
        return (
          <div className="space-y-6">
            <PrivacySection
              privacy={settings.privacy}
              darkModeEnabled={Boolean(appCtx?.dark)}
              onToggleDarkMode={() => {
                appCtx?.toggleDark();
                pushToast("success", t("toasts.autoSaved"));
              }}
              onAutoSavePrivacy={handleAutoSavePrivacy}
            />
            <LanguageSection
              languageRegion={{
                ...settings.languageRegion,
                language: activeLanguage,
              }}
              isRtl={isRtl}
              onChangeLanguage={handleLanguageChange}
              onAutoSaveLanguageRegion={handleAutoSaveLanguageRegion}
            />
          </div>
        );

      case "data":
        return (
          <DataSection
            pdfs={settings.pdfs}
            onDeletePdf={deleteUploadedPdf}
            onAccountDeleted={handleAccountDeleted}
            onShowToast={pushToast}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      <SettingsLayout
        activeTab={activeTab}
        dirtyTabs={dirtyTabs}
        onSelectTab={handleSelectTab}
        isRtl={isRtl}
        isMobileListView={isMobileListView}
        onNavigateToSection={handleMobileNavigateToSection}
        onNavigateBack={handleMobileNavigateBack}
        sectionSummaries={sectionSummaries}
        activeFormId={activeFormId}
      >
        {renderActiveTabContent()}
      </SettingsLayout>

      {/* Unsaved Changes Navigation Guard Modal (Desktop tab change) */}
      <ConfirmModal
        isOpen={pendingTabTarget !== null}
        title={t("unsavedModal.title")}
        description={t("unsavedModal.description")}
        confirmLabel={t("unsavedModal.discard")}
        cancelLabel={t("unsavedModal.stay")}
        variant="warning"
        onConfirm={handleConfirmDiscardTabChanges}
        onCancel={() => setPendingTabTarget(null)}
      />

      {/* Unsaved Changes Navigation Guard Modal (Mobile Back button) */}
      <ConfirmModal
        isOpen={pendingBackModal}
        title={t("unsavedModal.title")}
        description={t("unsavedModal.description")}
        confirmLabel={t("unsavedModal.discard")}
        cancelLabel={t("unsavedModal.stay")}
        variant="warning"
        onConfirm={handleConfirmDiscardBack}
        onCancel={() => setPendingBackModal(false)}
      />

      {/* Accessible Auto-Dismissing Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export function SettingsPage(props: SettingsPageProps = {}) {
  return (
    <I18nextProvider i18n={settingsI18n}>
      <SettingsPageContent {...props} />
    </I18nextProvider>
  );
}

export default SettingsPage;
