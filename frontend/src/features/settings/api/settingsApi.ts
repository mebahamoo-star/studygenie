import { settingsAxiosClient } from "./axiosClient";
import { mockSettingsApi } from "./settingsApi.mock";
import type {
  AvailabilityBlock,
  EnrolledCourseItem,
  UserSettingsPayload,
} from "../constants/settingsConstants";

/**
 * Single configuration flag to toggle between the Mock API layer and the real Spring Boot backend.
 * Set `VITE_SETTINGS_USE_REAL_API=true` in `.env` or flip `USE_MOCK_API` to `false` to connect directly to Spring Boot.
 */
export const USE_MOCK_API: boolean =
  import.meta.env["VITE_SETTINGS_USE_REAL_API"] !== "true";

export const settingsApi = {
  /**
   * GET /api/users/me/settings -> full settings object
   */
  async getSettings(): Promise<UserSettingsPayload> {
    if (USE_MOCK_API) {
      return mockSettingsApi.getSettings();
    }
    const response = await settingsAxiosClient.get("/api/users/me/settings");
    return response.data?.data ?? response.data;
  },

  /**
   * PATCH /api/users/me/settings -> partial update
   */
  async updateSettings(
    partial: Partial<UserSettingsPayload>
  ): Promise<UserSettingsPayload> {
    if (USE_MOCK_API) {
      return mockSettingsApi.patchSettings(partial);
    }
    const response = await settingsAxiosClient.patch(
      "/api/users/me/settings",
      partial
    );
    return response.data?.data ?? response.data;
  },

  /**
   * PUT /api/users/me/availability -> array of {dayOfWeek, startTime, endTime}
   */
  async updateAvailability(
    slots: AvailabilityBlock[]
  ): Promise<AvailabilityBlock[]> {
    if (USE_MOCK_API) {
      return mockSettingsApi.updateAvailability(slots);
    }
    const response = await settingsAxiosClient.put(
      "/api/users/me/availability",
      slots
    );
    return response.data?.data ?? response.data;
  },

  /**
   * POST /api/users/me/password -> {currentPassword, newPassword}
   */
  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    if (USE_MOCK_API) {
      return mockSettingsApi.changePassword(payload);
    }
    const response = await settingsAxiosClient.post(
      "/api/users/me/password",
      payload
    );
    return response.data?.data ?? response.data ?? { success: true };
  },

  /**
   * POST /api/users/me/logout-all
   */
  async logoutAllDevices(): Promise<{ revokedSessions?: number }> {
    if (USE_MOCK_API) {
      return mockSettingsApi.logoutAllDevices();
    }
    const response = await settingsAxiosClient.post("/api/users/me/logout-all");
    return response.data?.data ?? response.data ?? {};
  },

  /**
   * GET /api/users/me/courses
   */
  async getCourses(): Promise<EnrolledCourseItem[]> {
    if (USE_MOCK_API) {
      return mockSettingsApi.getCourses();
    }
    const response = await settingsAxiosClient.get("/api/users/me/courses");
    return response.data?.data ?? response.data;
  },

  /**
   * PATCH /api/users/me/courses/{id}
   */
  async updateCourse(
    courseId: string,
    payload: { examDate: string }
  ): Promise<EnrolledCourseItem> {
    if (USE_MOCK_API) {
      return mockSettingsApi.updateCourse(courseId, payload);
    }
    const response = await settingsAxiosClient.patch(
      `/api/users/me/courses/${encodeURIComponent(courseId)}`,
      payload
    );
    return response.data?.data ?? response.data;
  },

  /**
   * DELETE /api/users/me/courses/{id}
   */
  async leaveCourse(courseId: string): Promise<{ removedId: string }> {
    if (USE_MOCK_API) {
      return mockSettingsApi.leaveCourse(courseId);
    }
    await settingsAxiosClient.delete(
      `/api/users/me/courses/${encodeURIComponent(courseId)}`
    );
    return { removedId: courseId };
  },

  /**
   * GET /api/users/me/export
   */
  async exportData(): Promise<Record<string, unknown>> {
    if (USE_MOCK_API) {
      return mockSettingsApi.exportUserData();
    }
    const response = await settingsAxiosClient.get("/api/users/me/export");
    return response.data?.data ?? response.data;
  },

  /**
   * DELETE /api/users/me -> requires password
   */
  async deleteAccount(payload: { password: string }): Promise<{ deleted: boolean }> {
    if (USE_MOCK_API) {
      return mockSettingsApi.deleteAccount(payload);
    }
    await settingsAxiosClient.delete("/api/users/me", {
      data: payload,
    });
    return { deleted: true };
  },
};
