import React from "react";
import { useTranslation } from "react-i18next";
import { Moon } from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { SettingRow } from "../components/SettingRow";
import { ToggleSwitch } from "../components/ToggleSwitch";
import {
  REMINDER_LEAD_TIME_OPTIONS,
  type NotificationSettings,
} from "../constants/settingsConstants";

export interface NotificationsSectionProps {
  notifications: NotificationSettings;
  onAutoSaveNotification: (
    partial: Partial<NotificationSettings>,
    fieldKey: string
  ) => void;
}

export function NotificationsSection({
  notifications,
  onAutoSaveNotification,
}: NotificationsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* 1. Delivery Channels Card */}
      <SettingsCard
        title={t("notifications.channelsCardTitle")}
        description={t("notifications.channelsCardDescription")}
      >
        <SettingRow
          id="notif-email-toggle"
          label={t("notifications.emailLabel")}
          helperText={t("notifications.emailHelper")}
        >
          <ToggleSwitch
            id="notif-email-toggle"
            checked={notifications.emailEnabled}
            onChange={(val) =>
              onAutoSaveNotification({ emailEnabled: val }, "emailEnabled")
            }
            ariaLabel={t("notifications.emailLabel")}
          />
        </SettingRow>

        <SettingRow
          id="notif-push-toggle"
          label={t("notifications.pushLabel")}
          helperText={t("notifications.pushHelper")}
        >
          <ToggleSwitch
            id="notif-push-toggle"
            checked={notifications.browserPushEnabled}
            onChange={(val) =>
              onAutoSaveNotification(
                { browserPushEnabled: val },
                "browserPushEnabled"
              )
            }
            ariaLabel={t("notifications.pushLabel")}
          />
        </SettingRow>
      </SettingsCard>

      {/* 2. Study & Challenge Event Alerts Card */}
      <SettingsCard
        title={t("notifications.eventsCardTitle")}
        description={t("notifications.eventsCardDescription")}
      >
        {/* Session Reminder Toggle + Lead Time Select (5 / 10 / 30 min) */}
        <SettingRow
          id="notif-session-reminder"
          label={t("notifications.sessionReminderLabel")}
          helperText={t("notifications.sessionReminderHelper")}
        >
          <div className="flex flex-wrap items-center gap-3">
            {notifications.sessionReminderEnabled && (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="notif-lead-time-select"
                  className="text-xs font-medium text-slate-500"
                >
                  {t("notifications.leadTimeLabel")}:
                </label>
                <select
                  id="notif-lead-time-select"
                  value={notifications.sessionReminderLeadMinutes}
                  onChange={(e) => {
                    const mins = Number(e.target.value) as 5 | 10 | 30;
                    onAutoSaveNotification(
                      { sessionReminderLeadMinutes: mins },
                      "sessionReminderLeadMinutes"
                    );
                  }}
                  aria-label={t("notifications.leadTimeLabel")}
                  className="rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors duration-150 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                >
                  {REMINDER_LEAD_TIME_OPTIONS.map((mins) => (
                    <option key={mins} value={mins}>
                      {t(`notifications.leadTime${mins}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <ToggleSwitch
              id="notif-session-reminder"
              checked={notifications.sessionReminderEnabled}
              onChange={(val) =>
                onAutoSaveNotification(
                  { sessionReminderEnabled: val },
                  "sessionReminderEnabled"
                )
              }
              ariaLabel={t("notifications.sessionReminderLabel")}
            />
          </div>
        </SettingRow>

        <SettingRow
          id="notif-streak-reminder"
          label={t("notifications.streakReminderLabel")}
          helperText={t("notifications.streakReminderHelper")}
        >
          <ToggleSwitch
            id="notif-streak-reminder"
            checked={notifications.streakReminderEnabled}
            onChange={(val) =>
              onAutoSaveNotification(
                { streakReminderEnabled: val },
                "streakReminderEnabled"
              )
            }
            ariaLabel={t("notifications.streakReminderLabel")}
          />
        </SettingRow>

        <SettingRow
          id="notif-exam-countdown"
          label={t("notifications.examCountdownLabel")}
          helperText={t("notifications.examCountdownHelper")}
        >
          <ToggleSwitch
            id="notif-exam-countdown"
            checked={notifications.examCountdownEnabled}
            onChange={(val) =>
              onAutoSaveNotification(
                { examCountdownEnabled: val },
                "examCountdownEnabled"
              )
            }
            ariaLabel={t("notifications.examCountdownLabel")}
          />
        </SettingRow>

        <SettingRow
          id="notif-challenge-joiners"
          label={t("notifications.challengeJoinersLabel")}
          helperText={t("notifications.challengeJoinersHelper")}
        >
          <ToggleSwitch
            id="notif-challenge-joiners"
            checked={notifications.newChallengeJoinersEnabled}
            onChange={(val) =>
              onAutoSaveNotification(
                { newChallengeJoinersEnabled: val },
                "newChallengeJoinersEnabled"
              )
            }
            ariaLabel={t("notifications.challengeJoinersLabel")}
          />
        </SettingRow>
      </SettingsCard>

      {/* 3. Quiet Hours Card */}
      <SettingsCard
        title={t("notifications.quietHoursCardTitle")}
        description={t("notifications.quietHoursCardDescription")}
        headerAction={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
            <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {notifications.quietHoursStart} – {notifications.quietHoursEnd}
            </span>
          </span>
        }
      >
        <SettingRow
          id="notif-quiet-hours-toggle"
          label={t("notifications.quietHoursToggleLabel")}
          helperText={t("notifications.quietHoursToggleHelper")}
        >
          <ToggleSwitch
            id="notif-quiet-hours-toggle"
            checked={notifications.quietHoursEnabled}
            onChange={(val) =>
              onAutoSaveNotification(
                { quietHoursEnabled: val },
                "quietHoursEnabled"
              )
            }
            ariaLabel={t("notifications.quietHoursToggleLabel")}
          />
        </SettingRow>

        {notifications.quietHoursEnabled && (
          <div className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="quiet-hours-start"
                className="text-xs font-medium text-slate-600"
              >
                {t("notifications.quietStartLabel")}:
              </label>
              <input
                id="quiet-hours-start"
                type="time"
                value={notifications.quietHoursStart}
                onChange={(e) =>
                  onAutoSaveNotification(
                    { quietHoursStart: e.target.value },
                    "quietHoursStart"
                  )
                }
                className="rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <label
                htmlFor="quiet-hours-end"
                className="text-xs font-medium text-slate-600"
              >
                {t("notifications.quietEndLabel")}:
              </label>
              <input
                id="quiet-hours-end"
                type="time"
                value={notifications.quietHoursEnd}
                onChange={(e) =>
                  onAutoSaveNotification(
                    { quietHoursEnd: e.target.value },
                    "quietHoursEnd"
                  )
                }
                className="rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
