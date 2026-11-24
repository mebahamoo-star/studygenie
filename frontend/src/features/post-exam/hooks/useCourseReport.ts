import { useCallback, useEffect, useState } from "react";
import { postExamApi } from "../api/postExamApi";
import type { CourseReportResponse } from "../constants/postExamConstants";

const PDF_PREPARE_DURATION_MS = 350;

export function useCourseReport(enrollmentId: string) {
  const [report, setReport] = useState<CourseReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enrollmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await postExamApi.getCourseReport(enrollmentId);
      setReport(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load course report");
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const downloadPdfSummary = useCallback(async (noticeText: string) => {
    setIsDownloadingPdf(true);
    setPdfNotice(null);
    try {
      // TODO(backend): Replace mock delay + notice with real PDF report export endpoint
      await new Promise((resolve) =>
        setTimeout(resolve, PDF_PREPARE_DURATION_MS)
      );
      setPdfNotice(noticeText);
    } finally {
      setIsDownloadingPdf(false);
    }
  }, []);

  return {
    report,
    isLoading,
    error,
    isDownloadingPdf,
    pdfNotice,
    refresh,
    downloadPdfSummary,
  };
}
