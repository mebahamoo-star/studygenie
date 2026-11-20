import { useCallback, useEffect, useState } from "react";
import type { SectionId } from "../constants/settingsConstants";

export function useUnsavedChanges() {
  const [dirtySections, setDirtySections] = useState<
    Partial<Record<SectionId, boolean>>
  >({});
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const hasAnyDirtySection = Object.values(dirtySections).some(Boolean);

  const setSectionDirty = useCallback((section: SectionId, isDirty: boolean) => {
    setDirtySections((prev) => {
      if (Boolean(prev[section]) === isDirty) return prev;
      return { ...prev, [section]: isDirty };
    });
  }, []);

  useEffect(() => {
    if (!hasAnyDirtySection) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasAnyDirtySection]);

  const requestSectionChange = useCallback(
    (currentSection: SectionId, proceedCallback: () => void) => {
      if (dirtySections[currentSection]) {
        setPendingAction(() => proceedCallback);
      } else {
        proceedCallback();
      }
    },
    [dirtySections]
  );

  const confirmDiscardChanges = useCallback(
    (currentSection: SectionId) => {
      setSectionDirty(currentSection, false);
      if (pendingAction) {
        pendingAction();
      }
      setPendingAction(null);
    },
    [pendingAction, setSectionDirty]
  );

  const cancelDiscardChanges = useCallback(() => {
    setPendingAction(null);
  }, []);

  return {
    dirtySections,
    hasAnyDirtySection,
    setSectionDirty,
    isPromptOpen: pendingAction !== null,
    requestSectionChange,
    confirmDiscardChanges,
    cancelDiscardChanges,
  };
}
