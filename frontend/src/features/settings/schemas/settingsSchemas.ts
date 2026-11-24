import { z } from "zod";
import type { TFunction } from "i18next";
import { STUDY_LIMITS } from "../constants/settingsConstants";

export const createProfileSchema = (t: TFunction) =>
  z.object({
    displayName: z
      .string()
      .trim()
      .min(2, { message: t("validation.displayNameMin") })
      .max(60, { message: t("validation.displayNameMax") }),
    avatarUrl: z.string().nullable(),
  });

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;

export const createChangePasswordSchema = (t: TFunction) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, { message: t("validation.currentPasswordRequired") }),
      newPassword: z
        .string()
        .min(8, { message: t("validation.newPasswordMin") })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
          message: t("validation.newPasswordComplex"),
        }),
      confirmPassword: z.string().min(1, {
        message: t("validation.passwordsMustMatch"),
      }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.passwordsMustMatch"),
      path: ["confirmPassword"],
    });

export type ChangePasswordFormValues = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;

export const createStudyPreferencesSchema = () =>
  z.object({
    pomodoroFocusMinutes: z
      .number()
      .min(STUDY_LIMITS.FOCUS_MIN)
      .max(STUDY_LIMITS.FOCUS_MAX),
    pomodoroShortBreakMinutes: z
      .number()
      .min(STUDY_LIMITS.SHORT_BREAK_MIN)
      .max(STUDY_LIMITS.SHORT_BREAK_MAX),
    pomodoroLongBreakMinutes: z
      .number()
      .min(STUDY_LIMITS.LONG_BREAK_MIN)
      .max(STUDY_LIMITS.LONG_BREAK_MAX),
    pomodoroSessionsBeforeLongBreak: z
      .number()
      .min(STUDY_LIMITS.SESSIONS_MIN)
      .max(STUDY_LIMITS.SESSIONS_MAX),
    dailyStudyGoalHours: z
      .number()
      .min(STUDY_LIMITS.DAILY_GOAL_MIN)
      .max(STUDY_LIMITS.DAILY_GOAL_MAX),
    survivalModeEnabled: z.boolean(),
    survivalModeDaysBeforeExam: z
      .number()
      .min(STUDY_LIMITS.SURVIVAL_DAYS_MIN)
      .max(STUDY_LIMITS.SURVIVAL_DAYS_MAX),
  });

export type StudyPreferencesFormValues = z.infer<
  ReturnType<typeof createStudyPreferencesSchema>
>;

export const createAliasSchema = (t: TFunction) =>
  z.object({
    aliasName: z
      .string()
      .trim()
      .min(3, { message: t("validation.aliasMin") })
      .max(24, { message: t("validation.aliasMin") }),
  });

export type AliasFormValues = z.infer<ReturnType<typeof createAliasSchema>>;

export const createDeleteAccountSchema = (t: TFunction) =>
  z.object({
    confirmWord: z
      .string()
      .refine((val) => val === "DELETE", {
        message: t("validation.deleteWordMismatch"),
      }),
    password: z.string().min(1, {
      message: t("validation.passwordRequired"),
    }),
  });

export type DeleteAccountFormValues = z.infer<
  ReturnType<typeof createDeleteAccountSchema>
>;

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  level: "weak" | "fair" | "good" | "strong";
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) return { score: 0, level: "weak" };
  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  const clamped = Math.min(4, Math.max(1, points)) as 1 | 2 | 3 | 4;
  const levelMap: Record<1 | 2 | 3 | 4, PasswordStrengthResult["level"]> = {
    1: "weak",
    2: "fair",
    3: "good",
    4: "strong",
  };

  return {
    score: clamped,
    level: levelMap[clamped],
  };
}
