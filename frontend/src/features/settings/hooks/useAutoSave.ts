import { useCallback, useRef, useState } from "react";
import type { UserSettingsPayload } from "../constants/settingsConstants";

interface UseAutoSaveOptions {
  settings: UserSettingsPayload | null;
  setOptimisticSettings: React.Dispatch<
    React.SetStateAction<UserSettingsPayload | null>
  >;
  savePartialSettings: (
    partial: Partial<UserSettingsPayload>
  ) => Promise<UserSettingsPayload>;
  onSuccessToast: (message?: string) => void;
  onErrorToast: (message?: string) => void;
}

export function useAutoSave({
  settings,
  setOptimisticSettings,
  savePartialSettings,
  onSuccessToast,
  onErrorToast,
}: UseAutoSaveOptions) {
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const previousSnapshotRef = useRef<UserSettingsPayload | null>(null);

  const triggerAutoSave = useCallback(
    async <K extends keyof UserSettingsPayload>(
      sectionKey: K,
      updatedSubObject: Partial<UserSettingsPayload[K]>,
      fieldKey?: string,
      customSuccessMessage?: string
    ) => {
      if (!settings) return;
      previousSnapshotRef.current = structuredClone(settings);

      const currentSectionValue = settings[sectionKey];
      const mergedSection =
        typeof currentSectionValue === "object" &&
        currentSectionValue !== null &&
        !Array.isArray(currentSectionValue)
          ? { ...currentSectionValue, ...updatedSubObject }
          : updatedSubObject;

      // 1. Optimistic UI update immediately
      setOptimisticSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [sectionKey]: mergedSection,
        };
      });

      if (fieldKey) setSavingKey(fieldKey);

      try {
        // 2. Persist via PATCH /api/users/me/settings
        await savePartialSettings({
          [sectionKey]: mergedSection,
        } as Partial<UserSettingsPayload>);
        onSuccessToast(customSuccessMessage);
      } catch {
        // 3. Rollback on error
        if (previousSnapshotRef.current) {
          setOptimisticSettings(previousSnapshotRef.current);
        }
        onErrorToast();
      } finally {
        if (fieldKey) setSavingKey(null);
      }
    },
    [
      settings,
      setOptimisticSettings,
      savePartialSettings,
      onSuccessToast,
      onErrorToast,
    ]
  );

  return {
    triggerAutoSave,
    savingKey,
  };
}
