import { useCallback, useEffect, useState } from "react";
import { settingsApi } from "../api/settingsApi";
import type {
  AvailabilityBlock,
  EnrolledCourseItem,
  UserSettingsPayload,
} from "../constants/settingsConstants";

export interface UseSettingsReturn {
  settings: UserSettingsPayload | null;
  courses: EnrolledCourseItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setOptimisticSettings: React.Dispatch<
    React.SetStateAction<UserSettingsPayload | null>
  >;
  savePartialSettings: (
    partial: Partial<UserSettingsPayload>
  ) => Promise<UserSettingsPayload>;
  saveAvailability: (slots: AvailabilityBlock[]) => Promise<AvailabilityBlock[]>;
  updateCourseExamDate: (
    courseId: string,
    examDate: string
  ) => Promise<EnrolledCourseItem>;
  leaveCourseChallenge: (courseId: string) => Promise<void>;
  deleteUploadedPdf: (pdfId: string) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettingsPayload | null>(null);
  const [courses, setCourses] = useState<EnrolledCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedSettings, fetchedCourses] = await Promise.all([
        settingsApi.getSettings(),
        settingsApi.getCourses(),
      ]);
      setSettings(fetchedSettings);
      setCourses(fetchedCourses);
    } catch (err: any) {
      setError(err?.message || "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const savePartialSettings = useCallback(
    async (partial: Partial<UserSettingsPayload>) => {
      const updated = await settingsApi.updateSettings(partial);
      setSettings(updated);
      return updated;
    },
    []
  );

  const saveAvailability = useCallback(
    async (slots: AvailabilityBlock[]) => {
      const savedSlots = await settingsApi.updateAvailability(slots);
      setSettings((prev) =>
        prev ? { ...prev, availability: savedSlots } : prev
      );
      return savedSlots;
    },
    []
  );

  const updateCourseExamDate = useCallback(
    async (courseId: string, examDate: string) => {
      const updatedCourse = await settingsApi.updateCourse(courseId, {
        examDate,
      });
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? updatedCourse : c))
      );
      return updatedCourse;
    },
    []
  );

  const leaveCourseChallenge = useCallback(async (courseId: string) => {
    await settingsApi.leaveCourse(courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }, []);

  const deleteUploadedPdf = useCallback(
    async (pdfId: string) => {
      if (!settings) return;
      const nextPdfs = settings.pdfs.filter((p) => p.id !== pdfId);
      const updated = await settingsApi.updateSettings({ pdfs: nextPdfs });
      setSettings(updated);
    },
    [settings]
  );

  return {
    settings,
    courses,
    isLoading,
    error,
    refresh: fetchAll,
    setOptimisticSettings: setSettings,
    savePartialSettings,
    saveAvailability,
    updateCourseExamDate,
    leaveCourseChallenge,
    deleteUploadedPdf,
  };
}
