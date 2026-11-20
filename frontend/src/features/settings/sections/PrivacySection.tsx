import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { SettingRow } from "../components/SettingRow";
import { ToggleSwitch } from "../components/ToggleSwitch";
import {
  createAliasSchema,
  type AliasFormValues,
} from "../schemas/settingsSchemas";
import type { PrivacyGamificationSettings } from "../constants/settingsConstants";

export interface PrivacySectionProps {
  privacy: PrivacyGamificationSettings;
  darkModeEnabled?: boolean | undefined;
  onToggleDarkMode?: (() => void) | undefined;
  onAutoSavePrivacy: (
    partial: Partial<PrivacyGamificationSettings>,
    fieldKey: string
  ) => void;
}

export function PrivacySection({
  privacy,
  darkModeEnabled = false,
  onToggleDarkMode,
  onAutoSavePrivacy,
}: PrivacySectionProps) {
  const { t } = useTranslation();
  const aliasSchema = useMemo(() => createAliasSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AliasFormValues>({
    resolver: zodResolver(aliasSchema),
    defaultValues: {
      aliasName: privacy.aliasName || "",
    },
  });

  useEffect(() => {
    reset({ aliasName: privacy.aliasName || "" });
  }, [privacy.aliasName, reset]);

  const onSaveAlias = (values: AliasFormValues) => {
    onAutoSavePrivacy({ aliasName: values.aliasName.trim() }, "aliasName");
    reset({ aliasName: values.aliasName.trim() });
  };

  return (
    <div className="space-y-6">
      {/* 1. Leaderboards & Identity Card */}
      <SettingsCard
        title={t("privacy.leaderboardCardTitle")}
        description={t("privacy.leaderboardCardDescription")}
      >
        <SettingRow
          id="privacy-show-leaderboard"
          label={t("privacy.showLeaderboardLabel")}
          helperText={t("privacy.showLeaderboardHelper")}
        >
          <ToggleSwitch
            id="privacy-show-leaderboard"
            checked={privacy.showOnLeaderboards}
            onChange={(val) =>
              onAutoSavePrivacy(
                { showOnLeaderboards: val },
                "showOnLeaderboards"
              )
            }
            ariaLabel={t("privacy.showLeaderboardLabel")}
          />
        </SettingRow>

        <SettingRow
          id="privacy-use-alias"
          label={t("privacy.useAliasLabel")}
          helperText={t("privacy.useAliasHelper")}
        >
          <ToggleSwitch
            id="privacy-use-alias"
            checked={privacy.useAlias}
            onChange={(val) =>
              onAutoSavePrivacy({ useAlias: val }, "useAlias")
            }
            ariaLabel={t("privacy.useAliasLabel")}
          />
        </SettingRow>

        {/* Conditional Alias Input */}
        {privacy.useAlias && (
          <SettingRow
            id="privacy-alias-input"
            label={t("privacy.aliasInputLabel")}
            helperText={t("privacy.aliasInputHelper")}
            error={errors.aliasName?.message}
          >
            <form
              onSubmit={handleSubmit(onSaveAlias)}
              className="flex w-full items-center gap-2 sm:w-auto"
              noValidate
            >
              <input
                id="privacy-alias-input"
                type="text"
                placeholder={t("privacy.aliasPlaceholder")}
                {...register("aliasName")}
                className="w-full rounded-[12px] border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 sm:w-52"
              />
              <button
                type="submit"
                disabled={!isDirty}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[12px] bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("privacy.saveAliasBtn")}</span>
              </button>
            </form>
          </SettingRow>
        )}
      </SettingsCard>

      {/* 2. Appearance, Gamification & Sensory Feedback Card */}
      <SettingsCard
        title={t("privacy.experienceCardTitle")}
        description={t("privacy.experienceCardDescription")}
      >
        <SettingRow
          id="privacy-dark-mode-toggle"
          label={t("privacy.darkModeLabel")}
          helperText={t("privacy.darkModeHelper")}
        >
          <ToggleSwitch
            id="privacy-dark-mode-toggle"
            checked={darkModeEnabled}
            onChange={() => onToggleDarkMode?.()}
            ariaLabel={t("privacy.darkModeLabel")}
          />
        </SettingRow>

        <SettingRow
          id="privacy-sounds-toggle"
          label={t("privacy.soundsLabel")}
          helperText={t("privacy.soundsHelper")}
        >
          <ToggleSwitch
            id="privacy-sounds-toggle"
            checked={privacy.soundsEnabled}
            onChange={(val) =>
              onAutoSavePrivacy({ soundsEnabled: val }, "soundsEnabled")
            }
            ariaLabel={t("privacy.soundsLabel")}
          />
        </SettingRow>

        <SettingRow
          id="privacy-animations-toggle"
          label={t("privacy.animationsLabel")}
          helperText={t("privacy.animationsHelper")}
        >
          <ToggleSwitch
            id="privacy-animations-toggle"
            checked={privacy.animationsEnabled}
            onChange={(val) =>
              onAutoSavePrivacy({ animationsEnabled: val }, "animationsEnabled")
            }
            ariaLabel={t("privacy.animationsLabel")}
          />
        </SettingRow>

        <SettingRow
          id="privacy-genie-reactions-toggle"
          label={t("privacy.genieReactionsLabel")}
          helperText={t("privacy.genieReactionsHelper")}
        >
          <ToggleSwitch
            id="privacy-genie-reactions-toggle"
            checked={privacy.genieMascotReactionsEnabled}
            onChange={(val) =>
              onAutoSavePrivacy(
                { genieMascotReactionsEnabled: val },
                "genieMascotReactionsEnabled"
              )
            }
            ariaLabel={t("privacy.genieReactionsLabel")}
          />
        </SettingRow>
      </SettingsCard>
    </div>
  );
}
