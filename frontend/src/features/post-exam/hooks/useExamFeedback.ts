import { useCallback, useState } from "react";
import type { NormalizedApiError } from "@/features/settings/api/axiosClient";
import { postExamApi } from "../api/postExamApi";
import type { ExamFeedbackPayload } from "../constants/postExamConstants";

export function useExamFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = useCallback(() => {
    setSubmitError(null);
    setFieldErrors({});
  }, []);

  const submitFeedback = useCallback(
    async (enrollmentId: string, payload: ExamFeedbackPayload): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);
      setFieldErrors({});
      try {
        await postExamApi.submitFeedback(enrollmentId, payload);
        return true;
      } catch (err) {
        const apiErr = err as NormalizedApiError;
        setSubmitError(apiErr?.message || "postExam.feedback.errors.submitFailed");
        if (apiErr?.fieldErrors) {
          setFieldErrors(apiErr.fieldErrors);
        }
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    submitFeedback,
    isSubmitting,
    submitError,
    fieldErrors,
    clearError,
  };
}
