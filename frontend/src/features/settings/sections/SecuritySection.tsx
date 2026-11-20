import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound, Laptop, LogOut } from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { SettingRow } from "../components/SettingRow";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  createChangePasswordSchema,
  evaluatePasswordStrength,
  type ChangePasswordFormValues,
} from "../schemas/settingsSchemas";
import { settingsApi } from "../api/settingsApi";
import type { SectionId } from "../constants/settingsConstants";
import type { NormalizedApiError } from "../api/axiosClient";

export interface SecuritySectionProps {
  onDirtyChange: (section: SectionId, isDirty: boolean) => void;
  onShowToast: (type: "success" | "error", message: string) => void;
}

export function SecuritySection({
  onDirtyChange,
  onShowToast,
}: SecuritySectionProps) {
  const { t } = useTranslation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const schema = useMemo(() => createChangePasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    onDirtyChange("security", isDirty);
    return () => onDirtyChange("security", false);
  }, [isDirty, onDirtyChange]);

  const newPasswordValue = watch("newPassword");
  const strength = useMemo(
    () => evaluatePasswordStrength(newPasswordValue),
    [newPasswordValue]
  );

  const strengthColorMap = {
    weak: "bg-red-500 text-red-700",
    fair: "bg-amber-500 text-amber-700",
    good: "bg-indigo-500 text-indigo-700",
    strong: "bg-emerald-500 text-emerald-700",
  };

  const onSubmitPassword = async (values: ChangePasswordFormValues) => {
    try {
      await settingsApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      onDirtyChange("security", false);
      onShowToast("success", t("toasts.passwordChanged"));
    } catch (err) {
      const apiErr = err as NormalizedApiError;
      if (apiErr.fieldErrors) {
        Object.entries(apiErr.fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof ChangePasswordFormValues, { message: msg });
        });
      }
      onShowToast("error", apiErr.message || t("toasts.saveError"));
    }
  };

  const handleConfirmLogoutAll = async () => {
    setIsLoggingOutAll(true);
    try {
      await settingsApi.logoutAllDevices();
      setIsLogoutModalOpen(false);
      onShowToast("success", t("toasts.loggedOutAll"));
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Change Password Form */}
      <form onSubmit={handleSubmit(onSubmitPassword)} noValidate>
        <SettingsCard
          title={t("security.passwordCardTitle")}
          description={t("security.passwordCardDescription")}
          footer={
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className="inline-flex items-center gap-2 rounded-[12px] bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>
                {isSubmitting
                  ? t("page.saving")
                  : t("security.updatePasswordBtn")}
              </span>
            </button>
          }
        >
          {/* Current Password */}
          <SettingRow
            id="security-current-password"
            label={t("security.currentPasswordLabel")}
            helperText={t("security.currentPasswordHelper")}
            error={errors.currentPassword?.message}
          >
            <div className="relative w-full sm:w-72">
              <input
                id="security-current-password"
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={t("security.currentPasswordPlaceholder")}
                {...register("currentPassword")}
                className="w-full rounded-[12px] border border-slate-200 bg-white py-2.5 ps-3.5 pe-10 text-sm text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label="Toggle current password visibility"
                className="absolute inset-y-0 end-2.5 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-none"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </SettingRow>

          {/* New Password + Strength Meter */}
          <SettingRow
            id="security-new-password"
            label={t("security.newPasswordLabel")}
            helperText={t("security.newPasswordHelper")}
            error={errors.newPassword?.message}
          >
            <div className="w-full space-y-2 sm:w-72">
              <div className="relative">
                <input
                  id="security-new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={t("security.newPasswordPlaceholder")}
                  {...register("newPassword")}
                  className="w-full rounded-[12px] border border-slate-200 bg-white py-2.5 ps-3.5 pe-10 text-sm text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label="Toggle new password visibility"
                  className="absolute inset-y-0 end-2.5 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-none"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPasswordValue.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-slate-500">
                      {t("security.strength.label")}
                    </span>
                    <span
                      className={`font-semibold ${
                        strengthColorMap[strength.level].split(" ")[1]
                      }`}
                    >
                      {t(`security.strength.${strength.level}`)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={strength.score}
                    aria-valuemin={0}
                    aria-valuemax={4}
                    aria-label={t("security.strength.label")}
                    className="grid grid-cols-4 gap-1.5"
                  >
                    {[1, 2, 3, 4].map((barIdx) => {
                      const active = barIdx <= strength.score;
                      const barBg = active
                        ? strengthColorMap[strength.level].split(" ")[0]
                        : "bg-slate-200";
                      return (
                        <div
                          key={barIdx}
                          className={`h-1.5 rounded-full transition-colors duration-150 ${barBg}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </SettingRow>

          {/* Confirm New Password */}
          <SettingRow
            id="security-confirm-password"
            label={t("security.confirmPasswordLabel")}
            helperText={t("security.confirmPasswordHelper")}
            error={errors.confirmPassword?.message}
          >
            <input
              id="security-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder={t("security.confirmPasswordPlaceholder")}
              {...register("confirmPassword")}
              className="w-full rounded-[12px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 sm:w-72"
            />
          </SettingRow>
        </SettingsCard>
      </form>

      {/* Card 2: Active Sessions & Log Out from All Devices */}
      <SettingsCard
        title={t("security.sessionsCardTitle")}
        description={t("security.sessionsCardDescription")}
      >
        <div className="flex items-center justify-between gap-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-slate-100 text-slate-600">
              <Laptop className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {t("security.currentSessionTitle")}
              </p>
              <p className="text-xs text-slate-500">
                StudyGenie Web App • JWT Authenticated
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("security.currentSessionBadge")}
          </span>
        </div>

        <SettingRow
          label={t("security.logoutAllLabel")}
          helperText={t("security.logoutAllHelper")}
        >
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-[12px] border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-2xs transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t("security.logoutAllBtn")}</span>
          </button>
        </SettingRow>
      </SettingsCard>

      {/* Confirm Log Out All Devices Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title={t("security.logoutAllModalTitle")}
        description={t("security.logoutAllModalDesc")}
        confirmLabel={t("security.logoutAllBtn")}
        cancelLabel={t("page.cancel")}
        variant="danger"
        isLoading={isLoggingOutAll}
        onConfirm={handleConfirmLogoutAll}
        onCancel={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}
