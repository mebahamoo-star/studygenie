import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  CalendarClock,
  Database,
  Sparkles,
  User,
} from "lucide-react";
import {
  VALID_SETTINGS_TABS,
  type SettingsTabId,
} from "../constants/settingsConstants";
import { useMediaQuery } from "../hooks/useMediaQuery";

export interface SettingsTabItem {
  id: SettingsTabId;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETTINGS_TABS_LIST: SettingsTabItem[] = [
  { id: "profile", icon: User },
  { id: "study", icon: CalendarClock },
  { id: "notifications", icon: Bell },
  { id: "privacy", icon: Sparkles },
  { id: "data", icon: Database },
];

export interface SettingsTabsProps {
  activeTab: SettingsTabId;
  dirtyTabs: Partial<Record<SettingsTabId, boolean>>;
  onSelectTab: (tabId: SettingsTabId) => void;
  isRtl: boolean;
}

export function SettingsTabs({
  activeTab,
  dirtyTabs,
  onSelectTab,
  isRtl,
}: SettingsTabsProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Partial<Record<SettingsTabId, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });

  const updateIndicator = useCallback(() => {
    const activeEl = tabRefs.current[activeTab];
    if (!activeEl) return;
    const { offsetLeft, offsetWidth } = activeEl;
    if (offsetWidth > 0) {
      setIndicator({
        left: offsetLeft,
        width: offsetWidth,
        ready: true,
      });
    } else {
      setIndicator((prev) => ({ ...prev, ready: false }));
    }
  }, [activeTab]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, isRtl, t]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateIndicator]);

  // Auto-scroll active tab into view on mobile (<768px)
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      try {
        activeEl.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      } catch {
        // Fallback for older browsers or JSDOM
      }
    }
  }, [activeTab]);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) => {
    const count = VALID_SETTINGS_TABS.length;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = isRtl
        ? (currentIndex - 1 + count) % count
        : (currentIndex + 1) % count;
    } else if (event.key === "ArrowLeft") {
      nextIndex = isRtl
        ? (currentIndex + 1) % count
        : (currentIndex - 1 + count) % count;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = count - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const targetTab = VALID_SETTINGS_TABS[nextIndex];
      if (targetTab) {
        tabRefs.current[targetTab]?.focus();
        onSelectTab(targetTab);
      }
    }
  };

  if (isMobile) {
    return null;
  }

  return (
    <div className="sticky top-16 z-10 -mx-3 mb-6 hidden border-b border-slate-200/85 dark:border-border bg-[#F7F8FA]/95 dark:bg-background/95 px-3 backdrop-blur-xs md:block sm:-mx-6 sm:px-6">
      <div className="relative mx-auto max-w-[800px]">
        {/* Fade edges on mobile (<768px) as horizontal scroll hints */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[#F7F8FA] dark:from-background to-transparent md:hidden"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[#F7F8FA] dark:from-background to-transparent md:hidden"
        />

        {/* Horizontally scrollable tab list */}
        <div
          ref={scrollContainerRef}
          role="tablist"
          aria-label={t("page.title")}
          className="relative flex items-center gap-1 overflow-x-auto scroll-smooth px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {SETTINGS_TABS_LIST.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDirty = Boolean(dirtyTabs[tab.id]);

            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                id={`settings-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`settings-tabpanel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelectTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`group relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-[10px] px-4 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-inset ${
                  isActive
                    ? "text-indigo-600 dark:text-primary font-semibold"
                    : "text-slate-600 dark:text-muted-foreground hover:bg-slate-200/40 dark:hover:bg-muted/50 hover:text-slate-900 dark:hover:text-foreground"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                    isActive
                      ? "text-indigo-600 dark:text-primary"
                      : "text-slate-400 dark:text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-foreground"
                  }`}
                  aria-hidden="true"
                />
                <span>{t(`tabs.${tab.id}`)}</span>

                {isDirty && (
                  <span
                    title={t("page.unsavedBadge")}
                    aria-label={t("page.unsavedBadge")}
                    className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                  />
                )}

                {/* Fallback underline when layout measurements are unavailable (e.g. JSDOM) */}
                {!indicator.ready && isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-600"
                  />
                )}
              </button>
            );
          })}

          {/* Smooth sliding active underline indicator */}
          {indicator.ready && (
            <span
              aria-hidden="true"
              style={{
                left: `${indicator.left}px`,
                width: `${indicator.width}px`,
              }}
              className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-indigo-600 transition-all duration-200 ease-out"
            />
          )}
        </div>
      </div>
    </div>
  );
}
