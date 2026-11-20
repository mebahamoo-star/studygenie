import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe, Search } from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { SettingRow } from "../components/SettingRow";
import {
  TIMEZONE_OPTIONS,
  type LanguageRegionSettings,
} from "../constants/settingsConstants";

export interface LanguageSectionProps {
  languageRegion: LanguageRegionSettings;
  isRtl: boolean;
  onChangeLanguage: (lang: "en" | "ar") => void;
  onAutoSaveLanguageRegion: (
    partial: Partial<LanguageRegionSettings>,
    fieldKey: string
  ) => void;
}

export function LanguageSection({
  languageRegion,
  isRtl,
  onChangeLanguage,
  onAutoSaveLanguageRegion,
}: LanguageSectionProps) {
  const { t } = useTranslation();
  const [isTzOpen, setIsTzOpen] = useState(false);
  const [tzQuery, setTzQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isTzOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsTzOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isTzOpen]);

  const selectedTimezone = useMemo(
    () =>
      TIMEZONE_OPTIONS.find((tz) => tz.value === languageRegion.timezone) ??
      TIMEZONE_OPTIONS[0]!,
    [languageRegion.timezone]
  );

  const filteredTimezones = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return TIMEZONE_OPTIONS;
    return TIMEZONE_OPTIONS.filter(
      (tz) =>
        tz.labelEn.toLowerCase().includes(q) ||
        tz.labelAr.toLowerCase().includes(q) ||
        tz.value.toLowerCase().includes(q) ||
        tz.offset.toLowerCase().includes(q)
    );
  }, [tzQuery]);

  return (
    <div className="space-y-6">
      <SettingsCard
        title={t("language.cardTitle")}
        description={t("language.cardDescription")}
      >
        {/* 1. Interface Language (Arabic / English) */}
        <SettingRow
          label={t("language.languageLabel")}
          helperText={t("language.languageHelper")}
        >
          <div
            role="radiogroup"
            aria-label={t("language.languageLabel")}
            className="inline-grid grid-cols-2 gap-1 rounded-[12px] border border-slate-200 bg-slate-50 p-1"
          >
            {(["en", "ar"] as const).map((langCode) => {
              const active = languageRegion.language === langCode;
              return (
                <button
                  key={langCode}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChangeLanguage(langCode)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] px-4 py-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                    active
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {langCode === "en"
                      ? t("language.langEn")
                      : t("language.langAr")}
                  </span>
                </button>
              );
            })}
          </div>
        </SettingRow>

        {/* 2. Searchable Time Zone Select */}
        <SettingRow
          id="language-timezone-btn"
          label={t("language.timezoneLabel")}
          helperText={t("language.timezoneHelper")}
        >
          <div ref={dropdownRef} className="relative w-full sm:w-80">
            <button
              id="language-timezone-btn"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isTzOpen}
              onClick={() => setIsTzOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-slate-200 bg-white px-3.5 py-2.5 text-start text-sm text-slate-900 shadow-2xs transition-colors duration-150 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <div className="min-w-0 truncate">
                <span className="font-medium">
                  {isRtl ? selectedTimezone.labelAr : selectedTimezone.labelEn}
                </span>
                <span className="ms-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {selectedTimezone.offset}
                </span>
              </div>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            </button>

            {isTzOpen && (
              <div className="absolute end-0 z-30 mt-1.5 w-full rounded-[12px] border border-slate-200 bg-white p-2 shadow-xl">
                <div className="relative mb-2">
                  <Search
                    className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={tzQuery}
                    onChange={(e) => setTzQuery(e.target.value)}
                    placeholder={t("language.timezoneSearchPlaceholder")}
                    aria-label={t("language.timezoneSearchPlaceholder")}
                    autoFocus
                    className="w-full rounded-[10px] border border-slate-200 bg-slate-50 py-2 ps-9 pe-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <ul
                  role="listbox"
                  aria-label={t("language.timezoneLabel")}
                  className="max-h-56 overflow-y-auto divide-y divide-slate-50"
                >
                  {filteredTimezones.length === 0 ? (
                    <li className="px-3 py-4 text-center text-xs text-slate-400">
                      {t("language.timezoneNoResults")}
                    </li>
                  ) : (
                    filteredTimezones.map((tz) => {
                      const isSelected = tz.value === languageRegion.timezone;
                      return (
                        <li key={tz.value}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              onAutoSaveLanguageRegion(
                                { timezone: tz.value },
                                "timezone"
                              );
                              setIsTzOpen(false);
                              setTzQuery("");
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-start text-xs transition-colors duration-150 ${
                              isSelected
                                ? "bg-indigo-50 font-semibold text-indigo-700"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0 truncate">
                              <span>{isRtl ? tz.labelAr : tz.labelEn}</span>
                              <span className="ms-1.5 text-[10px] text-slate-400">
                                ({tz.offset})
                              </span>
                            </div>
                            {isSelected && (
                              <Check
                                className="h-3.5 w-3.5 shrink-0 text-indigo-600"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>
        </SettingRow>

        {/* 3. 12-hour / 24-hour Time Format */}
        <SettingRow
          id="language-time-format"
          label={t("language.timeFormatLabel")}
          helperText={t("language.timeFormatHelper")}
        >
          <select
            id="language-time-format"
            value={languageRegion.timeFormat}
            onChange={(e) =>
              onAutoSaveLanguageRegion(
                { timeFormat: e.target.value as "12h" | "24h" },
                "timeFormat"
              )
            }
            className="w-full rounded-[12px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 sm:w-56"
          >
            <option value="12h">{t("language.format12h")}</option>
            <option value="24h">{t("language.format24h")}</option>
          </select>
        </SettingRow>

        {/* 4. First Day of Week */}
        <SettingRow
          id="language-first-day"
          label={t("language.firstDayLabel")}
          helperText={t("language.firstDayHelper")}
        >
          <select
            id="language-first-day"
            value={languageRegion.firstDayOfWeek}
            onChange={(e) =>
              onAutoSaveLanguageRegion(
                {
                  firstDayOfWeek: e.target.value as
                    | "SUNDAY"
                    | "SATURDAY"
                    | "MONDAY",
                },
                "firstDayOfWeek"
              )
            }
            className="w-full rounded-[12px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 sm:w-56"
          >
            <option value="SUNDAY">{t("language.daySunday")}</option>
            <option value="SATURDAY">{t("language.daySaturday")}</option>
            <option value="MONDAY">{t("language.dayMonday")}</option>
          </select>
        </SettingRow>
      </SettingsCard>
    </div>
  );
}
