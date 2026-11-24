import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Camera,
  Crop,
  GraduationCap,
  Landmark,
  Lock,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { SettingRow } from "../components/SettingRow";
import { AvatarCropModal } from "../components/AvatarCropModal";
import {
  createProfileSchema,
  type ProfileFormValues,
} from "../schemas/settingsSchemas";
import {
  MAX_AVATAR_SIZE_BYTES,
  UNIVERSITIES_CATALOG,
  type ProfileSettings,
  type SectionId,
} from "../constants/settingsConstants";
import type { NormalizedApiError } from "../api/axiosClient";

export interface ProfileSectionProps {
  profile: ProfileSettings;
  isRtl: boolean;
  onSaveProfile: (updated: ProfileSettings) => Promise<void>;
  onDirtyChange: (section: SectionId, isDirty: boolean) => void;
  onShowToast: (type: "success" | "error", message: string) => void;
}

export function ProfileSection({
  profile,
  isRtl,
  onSaveProfile,
  onDirtyChange,
  onShowToast,
}: ProfileSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rawUploadSrc, setRawUploadSrc] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const schema = useMemo(() => createProfileSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    },
  });

  useEffect(() => {
    reset({
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });
  }, [profile, reset]);

  useEffect(() => {
    onDirtyChange("profile", isDirty);
    return () => onDirtyChange("profile", false);
  }, [isDirty, onDirtyChange]);

  const currentAvatarUrl = watch("avatarUrl");
  const currentDisplayName = watch("displayName");

  const resolvedAcademicAffiliation = useMemo(() => {
    const uni = UNIVERSITIES_CATALOG.find((u) => u.id === profile.universityId);
    const col = uni?.colleges.find((c) => c.id === profile.collegeId);
    return {
      universityLabel: uni
        ? isRtl
          ? uni.nameAr
          : uni.nameEn
        : profile.universityId || "—",
      collegeLabel: col
        ? isRtl
          ? col.nameAr
          : col.nameEn
        : profile.collegeId || "—",
    };
  }, [profile.universityId, profile.collegeId, isRtl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      onShowToast("error", t("validation.invalidSize"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setRawUploadSrc(reader.result);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleApplyCroppedAvatar = (croppedDataUrl: string) => {
    setValue("avatarUrl", croppedDataUrl, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setIsCropModalOpen(false);
  };

  const handleRemoveAvatar = () => {
    setValue("avatarUrl", null, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setRawUploadSrc(null);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await onSaveProfile({
        ...profile,
        displayName: values.displayName.trim(),
        universityId: profile.universityId,
        collegeId: profile.collegeId,
        avatarUrl: values.avatarUrl,
      });
      reset(values);
      onDirtyChange("profile", false);
      onShowToast("success", t("toasts.profileSaved"));
    } catch (err) {
      const apiErr = err as NormalizedApiError;
      if (apiErr.fieldErrors) {
        Object.entries(apiErr.fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof ProfileFormValues, { message: msg });
        });
      }
      onShowToast("error", apiErr.message || t("toasts.saveError"));
    }
  };

  const initials = useMemo(() => {
    const parts = (currentDisplayName || "SG").trim().split(/\s+/);
    return parts
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [currentDisplayName]);

  return (
    <form
      id="profile-form"
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      noValidate
    >
      {/* Card 1: Personal Identity & Avatar */}
      <SettingsCard
        title={t("profile.cardTitle")}
        description={t("profile.cardDescription")}
        footer={
          <button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="inline-flex items-center gap-2 rounded-[12px] bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>
              {isSubmitting ? t("page.saving") : t("page.saveChanges")}
            </span>
          </button>
        }
      >
        {/* Avatar Row */}
        <SettingRow
          label={t("profile.avatarLabel")}
          helperText={t("profile.avatarHelper")}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-indigo-50">
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={currentDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-bold text-indigo-700">
                  {initials}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
              aria-label={t("profile.uploadPhoto")}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t("profile.uploadPhoto")}</span>
            </button>

            {currentAvatarUrl && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRawUploadSrc(currentAvatarUrl);
                    setIsCropModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  <Crop className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("profile.cropPhoto")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-medium text-red-700 transition-colors duration-150 hover:bg-red-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("profile.removePhoto")}</span>
                </button>
              </>
            )}
          </div>
        </SettingRow>

        {/* Display Name Row */}
        <SettingRow
          id="profile-display-name"
          label={t("profile.displayNameLabel")}
          helperText={t("profile.displayNameHelper")}
          error={errors.displayName?.message}
        >
          <input
            id="profile-display-name"
            type="text"
            placeholder={t("profile.displayNamePlaceholder")}
            {...register("displayName")}
            className="w-full rounded-[12px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs transition-colors duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 sm:w-72"
          />
        </SettingRow>

        {/* Read-only Email Row with Lock Icon */}
        <SettingRow
          id="profile-email-readonly"
          label={t("profile.emailLabel")}
          helperText={t("profile.emailHelper")}
          badge={
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("page.readOnly")}
            </span>
          }
        >
          <div className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 sm:w-72">
            <span className="truncate">{profile.email}</span>
            <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </div>
        </SettingRow>
      </SettingsCard>

      {/* Card 2: Permanently Locked Academic Affiliation */}
      <SettingsCard
        title={t("profile.academicCardTitle")}
        description={t("profile.academicCardDescription")}
        headerAction={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("profile.academicLockedBadge")}</span>
          </span>
        }
      >
        {/* Academic Protection Notice */}
        <div className="py-4">
          <div className="flex items-start gap-3 rounded-[12px] border border-amber-200/90 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-900">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <div>
              <span className="font-semibold">
                {t("profile.academicLockedNoticeTitle")}
              </span>{" "}
              <span>{t("profile.academicLockedNoticeBody")}</span>
            </div>
          </div>
        </div>

        {/* Read-only University Row */}
        <SettingRow
          id="profile-university-readonly"
          label={t("profile.universityLabel")}
          helperText={t("profile.universityHelper")}
          badge={
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("page.readOnly")}
            </span>
          }
        >
          <div
            id="profile-university-readonly"
            className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-600 sm:w-80 select-none"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Landmark
                className="h-4 w-4 shrink-0 text-indigo-600"
                aria-hidden="true"
              />
              <span className="truncate">
                {resolvedAcademicAffiliation.universityLabel}
              </span>
            </div>
            <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {t("profile.verifiedBadge")}
            </span>
          </div>
        </SettingRow>

        {/* Read-only College Row */}
        <SettingRow
          id="profile-college-readonly"
          label={t("profile.collegeLabel")}
          helperText={t("profile.collegeHelper")}
          badge={
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("page.readOnly")}
            </span>
          }
        >
          <div
            id="profile-college-readonly"
            className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-600 sm:w-80 select-none"
          >
            <div className="flex min-w-0 items-center gap-2">
              <GraduationCap
                className="h-4 w-4 shrink-0 text-indigo-600"
                aria-hidden="true"
              />
              <span className="truncate">
                {resolvedAcademicAffiliation.collegeLabel}
              </span>
            </div>
            <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {t("profile.verifiedBadge")}
            </span>
          </div>
        </SettingRow>
      </SettingsCard>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={isCropModalOpen}
        imageSrc={rawUploadSrc}
        onApply={handleApplyCroppedAvatar}
        onClose={() => setIsCropModalOpen(false)}
      />
    </form>
  );
}
