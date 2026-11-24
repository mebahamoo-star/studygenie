import { settingsAxiosClient } from "@/features/settings/api/axiosClient";
import type {
  CourseFeedbackSummaryResponse,
  CourseReportResponse,
  EnrollmentStatus,
  ExamFeedbackPayload,
  PostExamEnrollment,
} from "../constants/postExamConstants";
import { mockPostExamApi } from "./postExamApi.mock";

/**
 * Toggle between the Mock API and the real Spring Boot backend.
 * Set `VITE_POST_EXAM_USE_REAL_API=true` in `.env` or flip this constant to `false`.
 */
export const USE_POST_EXAM_MOCK_API: boolean =
  import.meta.env["VITE_POST_EXAM_USE_REAL_API"] !== "true";

export const postExamApi = {
  async getEnrollments(status?: EnrollmentStatus): Promise<PostExamEnrollment[]> {
    if (USE_POST_EXAM_MOCK_API) {
      return mockPostExamApi.getEnrollments(status);
    }
    const response = await settingsAxiosClient.get("/api/enrollments", {
      params: status ? { status } : undefined,
    });
    return response.data?.data ?? response.data ?? [];
  },

  async markCelebrationSeen(enrollmentId: string): Promise<{ success: boolean }> {
    if (USE_POST_EXAM_MOCK_API) {
      return mockPostExamApi.markCelebrationSeen(enrollmentId);
    }
    const response = await settingsAxiosClient.post(
      `/api/enrollments/${encodeURIComponent(enrollmentId)}/celebration-seen`
    );
    return response.data?.data ?? response.data ?? { success: true };
  },

  async submitFeedback(
    enrollmentId: string,
    payload: ExamFeedbackPayload
  ): Promise<{ success: boolean }> {
    if (USE_POST_EXAM_MOCK_API) {
      return mockPostExamApi.submitFeedback(enrollmentId, payload);
    }
    const response = await settingsAxiosClient.post(
      `/api/enrollments/${encodeURIComponent(enrollmentId)}/feedback`,
      payload
    );
    return response.data?.data ?? response.data ?? { success: true };
  },

  async getCourseReport(enrollmentId: string): Promise<CourseReportResponse> {
    if (USE_POST_EXAM_MOCK_API) {
      return mockPostExamApi.getCourseReport(enrollmentId);
    }
    const response = await settingsAxiosClient.get(
      `/api/enrollments/${encodeURIComponent(enrollmentId)}/report`
    );
    return response.data?.data ?? response.data;
  },

  async reopenEnrollment(enrollmentId: string): Promise<PostExamEnrollment> {
    if (USE_POST_EXAM_MOCK_API) {
      return mockPostExamApi.reopenEnrollment(enrollmentId);
    }
    const response = await settingsAxiosClient.post(
      `/api/enrollments/${encodeURIComponent(enrollmentId)}/reopen`
    );
    return response.data?.data ?? response.data;
  },

  async archiveEnrollment(enrollmentId: string): Promise<PostExamEnrollment> {
    if (USE_POST_EXAM_MOCK_API) {
      return mockPostExamApi.archiveEnrollment(enrollmentId);
    }
    const response = await settingsAxiosClient.post(
      `/api/enrollments/${encodeURIComponent(enrollmentId)}/archive`
    );
    return response.data?.data ?? response.data;
  },

  async getCourseFeedbackSummary(
    courseNameOrId: string | number
  ): Promise<CourseFeedbackSummaryResponse> {
    if (USE_POST_EXAM_MOCK_API) {
      return mockPostExamApi.getCourseFeedbackSummary(courseNameOrId);
    }
    const response = await settingsAxiosClient.get(
      `/api/courses/${encodeURIComponent(String(courseNameOrId))}/feedback-summary`
    );
    return response.data?.data ?? response.data;
  },
};
