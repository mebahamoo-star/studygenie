import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileText,
  Loader2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { SettingsCard } from "../components/SettingsCard";
import { SettingRow } from "../components/SettingRow";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  createDeleteAccountSchema,
  type DeleteAccountFormValues,
} from "../schemas/settingsSchemas";
import { settingsApi } from "../api/settingsApi";
import type { UploadedPdfItem } from "../constants/settingsConstants";
import type { NormalizedApiError } from "../api/axiosClient";

export interface DataSectionProps {
  pdfs: UploadedPdfItem[];
  onDeletePdf: (pdfId: string) => Promise<void>;
  onAccountDeleted: () => void;
  onShowToast: (type: "success" | "error", message: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function DataSection({
  pdfs,
  onDeletePdf,
  onAccountDeleted,
  onShowToast,
}: DataSectionProps) {
  const { t } = useTranslation();
  const [pdfToDelete, setPdfToDelete] = useState<UploadedPdfItem | null>(null);
  const [isDeletingPdf, setIsDeletingPdf] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);

  const deleteSchema = useMemo(() => createDeleteAccountSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      confirmWord: "",
      password: "",
    },
  });

  const confirmWordVal = watch("confirmWord");
  const passwordVal = watch("password");

  const handleConfirmDeletePdf = async () => {
    if (!pdfToDelete) return;
    setIsDeletingPdf(true);
    try {
      await onDeletePdf(pdfToDelete.id);
      setPdfToDelete(null);
      onShowToast("success", t("toasts.pdfDeleted"));
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setIsDeletingPdf(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const archive = await settingsApi.exportData();
      const jsonBlob = new Blob([JSON.stringify(archive, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(jsonBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `studygenie-data-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      onShowToast("success", t("toasts.dataExported"));
    } catch (err: any) {
      onShowToast("error", err?.message || t("toasts.saveError"));
    } finally {
      setIsExporting(false);
    }
  };

  const onSubmitDeleteAccount = async (values: DeleteAccountFormValues) => {
    try {
      await settingsApi.deleteAccount({ password: values.password });
      setIsDeleteAccountModalOpen(false);
      onShowToast("success", t("toasts.accountDeleted"));
      onAccountDeleted();
    } catch (err) {
      const apiErr = err as NormalizedApiError;
      if (apiErr.fieldErrors) {
        Object.entries(apiErr.fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof DeleteAccountFormValues, { message: msg });
        });
      }
      onShowToast("error", apiErr.message || t("toasts.saveError"));
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Uploaded PDFs Card */}
      <SettingsCard
        title={t("data.pdfsCardTitle")}
        description={t("data.pdfsCardDescription")}
      >
        {pdfs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-2.5 text-sm font-semibold text-slate-900">
              {t("data.emptyPdfsTitle")}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {t("data.emptyPdfsDesc")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {pdf.name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-indigo-600">
                        {pdf.courseName}
                      </span>
                      <span>•</span>
                      <span className="tabular-nums">
                        {formatFileSize(pdf.sizeBytes)}
                      </span>
                      <span>•</span>
                      <span>
                        {t("data.pdfUploadedOn")} {pdf.uploadedAt}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPdfToDelete(pdf)}
                  aria-label={`${t("data.deletePdfBtn")} ${pdf.name}`}
                  className="inline-flex items-center gap-1.5 self-start rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 sm:self-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t("page.delete")}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* 2. Export Data Card */}
      <SettingsCard
        title={t("data.exportCardTitle")}
        description={t("data.exportCardDescription")}
      >
        <SettingRow
          label={t("data.exportLabel")}
          helperText={t("data.exportHelper")}
        >
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportData}
            className="inline-flex items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-2xs transition-colors duration-150 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
            ) : (
              <Download className="h-4 w-4 text-indigo-600" aria-hidden="true" />
            )}
            <span>
              {isExporting ? t("data.exportingBtn") : t("data.exportBtn")}
            </span>
          </button>
        </SettingRow>
      </SettingsCard>

      {/* 3. Danger Zone Card (Red-tinted border) */}
      <SettingsCard
        title={t("data.dangerCardTitle")}
        description={t("data.dangerCardDescription")}
        variant="danger"
      >
        <SettingRow
          label={t("data.deleteAccountLabel")}
          helperText={t("data.deleteAccountHelper")}
        >
          <button
            type="button"
            onClick={() => {
              reset({ confirmWord: "", password: "" });
              setIsDeleteAccountModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-[12px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors duration-150 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            <span>{t("data.deleteAccountBtn")}</span>
          </button>
        </SettingRow>
      </SettingsCard>

      {/* Delete PDF Confirmation Modal */}
      <ConfirmModal
        isOpen={pdfToDelete !== null}
        title={t("data.deletePdfModalTitle")}
        description={t("data.deletePdfModalDesc", {
          name: pdfToDelete?.name || "",
        })}
        confirmLabel={t("page.delete")}
        cancelLabel={t("page.cancel")}
        variant="danger"
        isLoading={isDeletingPdf}
        onConfirm={handleConfirmDeletePdf}
        onCancel={() => setPdfToDelete(null)}
      />

      {/* Delete Account Modal requiring typing DELETE + password */}
      <ConfirmModal
        isOpen={isDeleteAccountModalOpen}
        title={t("data.deleteModalTitle")}
        description={t("data.deleteModalWarning")}
        confirmLabel={t("data.deleteFinalBtn")}
        cancelLabel={t("page.cancel")}
        variant="danger"
        isLoading={isSubmitting}
        confirmDisabled={confirmWordVal !== "DELETE" || !passwordVal}
        onConfirm={handleSubmit(onSubmitDeleteAccount)}
        onCancel={() => setIsDeleteAccountModalOpen(false)}
      >
        <form
          onSubmit={handleSubmit(onSubmitDeleteAccount)}
          className="space-y-3.5 border-t border-slate-100 pt-3.5"
          noValidate
        >
          <div>
            <label
              htmlFor="delete-confirm-word"
              className="block text-xs font-semibold text-slate-700"
            >
              {t("data.deleteConfirmWordLabel")}
            </label>
            <input
              id="delete-confirm-word"
              type="text"
              placeholder={t("data.deleteConfirmWordPlaceholder")}
              {...register("confirmWord")}
              className="mt-1 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            {errors.confirmWord && (
              <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                {errors.confirmWord.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="delete-confirm-password"
              className="block text-xs font-semibold text-slate-700"
            >
              {t("data.deletePasswordLabel")}
            </label>
            <input
              id="delete-confirm-password"
              type="password"
              autoComplete="current-password"
              placeholder={t("data.deletePasswordPlaceholder")}
              {...register("password")}
              className="mt-1 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            {errors.password && (
              <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
        </form>
      </ConfirmModal>
    </div>
  );
}
