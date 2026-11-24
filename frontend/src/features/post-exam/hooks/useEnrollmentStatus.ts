import { useCallback, useEffect, useMemo, useState } from "react";
import { postExamApi } from "../api/postExamApi";
import { mockPostExamApi } from "../api/postExamApi.mock";
import type {
  EnrollmentStatus,
  PostExamEnrollment,
} from "../constants/postExamConstants";

export function useEnrollmentStatus(filterStatus?: EnrollmentStatus) {
  const [enrollments, setEnrollments] = useState<PostExamEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await postExamApi.getEnrollments(filterStatus);
      setEnrollments(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load enrollments");
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pendingCelebrationEnrollment = useMemo(
    () =>
      enrollments.find(
        (item) => item.status === "COMPLETED" && !item.celebrationSeen
      ) ?? null,
    [enrollments]
  );

  const markCelebrationSeen = useCallback(async (enrollmentId: string) => {
    await postExamApi.markCelebrationSeen(enrollmentId);
    setEnrollments((prev) =>
      prev.map((item) =>
        item.id === enrollmentId ? { ...item, celebrationSeen: true } : item
      )
    );
  }, []);

  const reopenEnrollment = useCallback(async (enrollmentId: string) => {
    const updated = await postExamApi.reopenEnrollment(enrollmentId);
    setEnrollments((prev) =>
      prev.map((item) => (item.id === enrollmentId ? updated : item))
    );
    return updated;
  }, []);

  const archiveEnrollment = useCallback(async (enrollmentId: string) => {
    const updated = await postExamApi.archiveEnrollment(enrollmentId);
    setEnrollments((prev) =>
      prev.map((item) => (item.id === enrollmentId ? updated : item))
    );
    return updated;
  }, []);

  const resetDemoCelebration = useCallback(async () => {
    mockPostExamApi.resetMockPostExamState();
    await refresh();
  }, [refresh]);

  return {
    enrollments,
    pendingCelebrationEnrollment,
    isLoading,
    error,
    refresh,
    markCelebrationSeen,
    reopenEnrollment,
    archiveEnrollment,
    resetDemoCelebration,
  };
}
