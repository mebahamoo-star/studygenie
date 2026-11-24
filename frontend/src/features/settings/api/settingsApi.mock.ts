import {
  DEFAULT_ENROLLED_COURSES,
  DEFAULT_USER_SETTINGS,
  UNIVERSITIES_CATALOG,
  type AvailabilityBlock,
  type EnrolledCourseItem,
  type UserSettingsPayload,
} from "../constants/settingsConstants";
import { getStoredUser } from "@/lib/api/client";
import {
  getUserAcademicProfile,
  getUserCourses,
  getUserStoragePrefix,
  saveUserAcademicProfile,
} from "@/lib/courses-util";
import type { NormalizedApiError } from "./axiosClient";

const MOCK_LATENCY_MS = 260;

function simulateDelay(ms = MOCK_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSettingsStorageKey(): string {
  const prefix = getUserStoragePrefix();
  return `sg_${prefix}_settings_v2`;
}

function getCoursesStorageKey(): string {
  const prefix = getUserStoragePrefix();
  return `sg_${prefix}_enrolled_courses_v2`;
}

function loadPersistedSettings(): UserSettingsPayload {
  try {
    const raw = localStorage.getItem(getSettingsStorageKey());
    const storedUser = getStoredUser();
    const academic = getUserAcademicProfile();

    if (raw) {
      const parsed = JSON.parse(raw) as UserSettingsPayload;
      return {
        ...DEFAULT_USER_SETTINGS,
        ...parsed,
        profile: {
          ...DEFAULT_USER_SETTINGS.profile,
          ...parsed.profile,
          email: storedUser?.email || parsed.profile?.email || DEFAULT_USER_SETTINGS.profile.email,
          displayName:
            parsed.profile?.displayName ||
            storedUser?.fullName ||
            DEFAULT_USER_SETTINGS.profile.displayName,
        },
      };
    }

    // Seed from currently authenticated user if available
    let seededUniId = DEFAULT_USER_SETTINGS.profile.universityId;
    let seededColId = DEFAULT_USER_SETTINGS.profile.collegeId;

    if (academic.uni?.name) {
      const matchedUni = UNIVERSITIES_CATALOG.find(
        (u) =>
          u.nameEn.toLowerCase().includes(academic.uni!.name.toLowerCase()) ||
          u.nameAr.includes(academic.uni!.name)
      );
      if (matchedUni) {
        seededUniId = matchedUni.id;
        if (matchedUni.colleges[0]) {
          seededColId = matchedUni.colleges[0].id;
        }
      }
    }

    const initial: UserSettingsPayload = {
      ...DEFAULT_USER_SETTINGS,
      profile: {
        ...DEFAULT_USER_SETTINGS.profile,
        displayName: storedUser?.fullName || DEFAULT_USER_SETTINGS.profile.displayName,
        email: storedUser?.email || DEFAULT_USER_SETTINGS.profile.email,
        universityId: seededUniId,
        collegeId: seededColId,
      },
    };

    localStorage.setItem(getSettingsStorageKey(), JSON.stringify(initial));
    return initial;
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

function savePersistedSettings(settings: UserSettingsPayload): void {
  try {
    localStorage.setItem(getSettingsStorageKey(), JSON.stringify(settings));
  } catch {
    // Ignore quota errors
  }
}

function loadPersistedCourses(): EnrolledCourseItem[] {
  try {
    const raw = localStorage.getItem(getCoursesStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Try hydrating from app's enrolled courses if any exist
    const appCourses = getUserCourses();
    if (appCourses.length > 0) {
      const mapped: EnrolledCourseItem[] = appCourses.map((c, index) => ({
        id: String(c.id || `course_${index + 1}`),
        name: c.name,
        code: c.code || `CS 30${index + 1}`,
        examDate: "2026-12-15",
        progressPercent: c.topics && c.topics.length > 0 ? 65 : 35,
        participantsCount: 24 + index * 9,
      }));
      localStorage.setItem(getCoursesStorageKey(), JSON.stringify(mapped));
      return mapped;
    }

    localStorage.setItem(getCoursesStorageKey(), JSON.stringify(DEFAULT_ENROLLED_COURSES));
    return DEFAULT_ENROLLED_COURSES;
  } catch {
    return DEFAULT_ENROLLED_COURSES;
  }
}

function savePersistedCourses(courses: EnrolledCourseItem[]): void {
  try {
    localStorage.setItem(getCoursesStorageKey(), JSON.stringify(courses));
  } catch {
    // Ignore storage errors
  }
}

export const mockSettingsApi = {
  async getSettings(): Promise<UserSettingsPayload> {
    await simulateDelay();
    return loadPersistedSettings();
  },

  async patchSettings(
    partial: Partial<UserSettingsPayload>
  ): Promise<UserSettingsPayload> {
    await simulateDelay();
    const current = loadPersistedSettings();
    const updated: UserSettingsPayload = {
      ...current,
      ...partial,
      profile: {
        ...current.profile,
        ...(partial.profile || {}),
        // Academic affiliation is permanently locked after onboarding
        universityId: current.profile.universityId,
        collegeId: current.profile.collegeId,
      },
      studyPreferences: {
        ...current.studyPreferences,
        ...(partial.studyPreferences || {}),
      },
      notifications: {
        ...current.notifications,
        ...(partial.notifications || {}),
      },
      privacy: {
        ...current.privacy,
        ...(partial.privacy || {}),
      },
      languageRegion: {
        ...current.languageRegion,
        ...(partial.languageRegion || {}),
      },
      pdfs: partial.pdfs !== undefined ? partial.pdfs : current.pdfs,
    };

    savePersistedSettings(updated);

    // Sync display name and academic profile with StudyGenie app storage
    if (partial.profile) {
      try {
        const storedUser = getStoredUser();
        if (storedUser && partial.profile.displayName) {
          const nextUser = { ...storedUser, fullName: partial.profile.displayName };
          localStorage.setItem("sg_user", JSON.stringify(nextUser));
          window.dispatchEvent(new CustomEvent("sg-user-sync", { detail: nextUser }));
        }

        const uniObj = UNIVERSITIES_CATALOG.find(
          (u) => u.id === updated.profile.universityId
        );
        const colObj = uniObj?.colleges.find(
          (c) => c.id === updated.profile.collegeId
        );
        if (uniObj && colObj) {
          saveUserAcademicProfile({
            uni: { id: uniObj.id, name: uniObj.nameEn },
            col: { id: colObj.id, name: colObj.nameEn },
          });
        }
      } catch {
        // Ignore sync errors
      }
    }

    return updated;
  },

  async updateAvailability(
    availability: AvailabilityBlock[]
  ): Promise<AvailabilityBlock[]> {
    await simulateDelay();
    const current = loadPersistedSettings();
    const updated: UserSettingsPayload = {
      ...current,
      availability,
    };
    savePersistedSettings(updated);
    return availability;
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    await simulateDelay(350);
    if (payload.currentPassword.trim().toLowerCase() === "wrong") {
      const err: NormalizedApiError = new Error("Current password is incorrect");
      err.status = 422;
      err.fieldErrors = {
        currentPassword: "The current password you entered is incorrect.",
      };
      throw err;
    }
    return { success: true };
  },

  async logoutAllDevices(): Promise<{ revokedSessions: number }> {
    await simulateDelay(300);
    return { revokedSessions: 3 };
  },

  async getCourses(): Promise<EnrolledCourseItem[]> {
    await simulateDelay(200);
    return loadPersistedCourses();
  },

  async updateCourse(
    courseId: string,
    payload: { examDate: string }
  ): Promise<EnrolledCourseItem> {
    await simulateDelay(220);
    const courses = loadPersistedCourses();
    const idx = courses.findIndex((c) => c.id === courseId);
    const existing = courses[idx];
    if (idx === -1 || !existing) {
      throw new Error("Course not found");
    }
    const updatedItem: EnrolledCourseItem = {
      ...existing,
      examDate: payload.examDate,
    };
    const nextCourses = [...courses];
    nextCourses[idx] = updatedItem;
    savePersistedCourses(nextCourses);
    return updatedItem;
  },

  async leaveCourse(courseId: string): Promise<{ removedId: string }> {
    await simulateDelay(250);
    const courses = loadPersistedCourses();
    const nextCourses = courses.filter((c) => c.id !== courseId);
    savePersistedCourses(nextCourses);
    return { removedId: courseId };
  },

  async exportUserData(): Promise<Record<string, unknown>> {
    await simulateDelay(550);
    const settings = loadPersistedSettings();
    const courses = loadPersistedCourses();
    return {
      exportedAt: new Date().toISOString(),
      platform: "StudyGenie AI Study Planner",
      version: "2.0.0",
      account: settings.profile,
      studyPreferences: settings.studyPreferences,
      weeklyAvailability: settings.availability,
      notifications: settings.notifications,
      privacyAndGamification: settings.privacy,
      languageAndRegion: settings.languageRegion,
      enrolledCourses: courses,
      uploadedDocuments: settings.pdfs,
    };
  },

  async deleteAccount(payload: { password: string }): Promise<{ deleted: boolean }> {
    await simulateDelay(450);
    if (payload.password.trim().toLowerCase() === "wrong") {
      const err: NormalizedApiError = new Error("Incorrect password");
      err.status = 422;
      err.fieldErrors = {
        password: "Incorrect account password.",
      };
      throw err;
    }
    localStorage.removeItem(getSettingsStorageKey());
    localStorage.removeItem(getCoursesStorageKey());
    return { deleted: true };
  },
};
