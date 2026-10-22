import { fetchApi, clearAuthSession, getStoredRefreshToken, saveAuthSession } from "./client";
import type {
  ApiResponse,
  AuthResponse,
  ClientQuizQuestion,
  College,
  Course,
  CourseStatus,
  GamificationProfile,
  LeaderboardEntry,
  PlanResponseData,
  ProgressResponse,
  QuizSubmissionResponse,
  ReviewItem,
  ReviewResponse,
  Topic,
  University,
  UserSummary,
} from "./types";

export const authService = {
  async register(fullName: string, email: string, password: string): Promise<AuthResponse> {
    const res = await fetchApi<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password }),
    });
    if (res.data) saveAuthSession(res.data);
    return res.data!;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetchApi<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.data) saveAuthSession(res.data);
    return res.data!;
  },

  async logout(): Promise<void> {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await fetchApi("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore logout network errors
      }
    }
    clearAuthSession();
  },

  async getMe(): Promise<UserSummary> {
    const res = await fetchApi<UserSummary>("/api/auth/me");
    return res.data!;
  },

  async getOAuthInfo(redirectUri?: string): Promise<{
    googleConfigured: boolean;
    microsoftConfigured: boolean;
    googleAuthUrl: string;
    microsoftAuthUrl: string;
  }> {
    const url = redirectUri ? `/api/auth/oauth/info?redirectUri=${encodeURIComponent(redirectUri)}` : "/api/auth/oauth/info";
    const res = await fetchApi<{
      googleConfigured: boolean;
      microsoftConfigured: boolean;
      googleAuthUrl: string;
      microsoftAuthUrl: string;
    }>(url);
    return res.data || { googleConfigured: false, microsoftConfigured: false, googleAuthUrl: "", microsoftAuthUrl: "" };
  },

  async oauthLogin(provider: "google" | "microsoft", code?: string, idToken?: string, redirectUri?: string): Promise<AuthResponse> {
    const res = await fetchApi<AuthResponse>("/api/auth/oauth/login", {
      method: "POST",
      body: JSON.stringify({ provider, code, idToken, redirectUri }),
    });
    if (res.data) saveAuthSession(res.data);
    return res.data!;
  },
};

function mapBackendCourseStatus(raw: string): CourseStatus {
  switch (raw?.toUpperCase()) {
    case "READY":
      return "ready";
    case "PENDING_PARSE":
    case "PARSING":
      return "processing";
    case "NO_SYLLABUS":
    case "FAILED":
    default:
      return "none";
  }
}

export const browseService = {
  async getUniversities(): Promise<University[]> {
    const res = await fetchApi<University[]>("/api/v1/universities");
    return res.data || [];
  },

  async createUniversity(name: string): Promise<University> {
    const res = await fetchApi<University>("/api/v1/universities", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return res.data!;
  },

  async createCollege(universityId: number | string, name: string): Promise<College> {
    const res = await fetchApi<College>(`/api/v1/universities/${universityId}/colleges`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return res.data!;
  },

  async getColleges(universityId: number | string): Promise<College[]> {
    const res = await fetchApi<College[]>(`/api/v1/universities/${universityId}/colleges`);
    return res.data || [];
  },

  async getAllCourses(collegeId?: number | string): Promise<Course[]> {
    const isNum = collegeId && !isNaN(Number(collegeId));
    const url = isNum ? `/api/v1/courses?collegeId=${collegeId}` : `/api/v1/courses`;
    try {
      const res = await fetchApi<any[]>(url);
      return (res.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code || `CS ${c.id}`,
        collegeId: c.collegeId,
        status: mapBackendCourseStatus(c.status),
      }));
    } catch {
      return [];
    }
  },

  async getEnrolledCourses(): Promise<Course[]> {
    try {
      const res = await fetchApi<any[]>("/api/v1/courses/enrolled");
      return (res.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code || `C-${c.id}`,
        collegeId: c.collegeId,
        status: mapBackendCourseStatus(c.status),
      }));
    } catch {
      return [];
    }
  },

  async deleteCourse(courseId: number | string): Promise<void> {
    await fetchApi<void>(`/api/v1/courses/${courseId}`, {
      method: "DELETE",
    });
  },

  async enrollCourse(courseId: number | string): Promise<Course> {
    const res = await fetchApi<any>(`/api/v1/courses/${courseId}/enroll`, {
      method: "POST",
    });
    const c = res.data!;
    return {
      id: c.id,
      name: c.name,
      code: c.code || `CS ${c.id}`,
      collegeId: c.collegeId,
      status: mapBackendCourseStatus(c.status),
    };
  },

  async unenrollCourse(courseId: number | string): Promise<void> {
    await fetchApi<void>(`/api/v1/courses/${courseId}/enroll`, {
      method: "DELETE",
    });
  },

  async syncEnrolledCourses(courseIdentifiers: (number | string)[]): Promise<Course[]> {
    const res = await fetchApi<any[]>("/api/v1/courses/sync-enrolled", {
      method: "POST",
      body: JSON.stringify(courseIdentifiers.map(String)),
    });
    return (res.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.code || `CS ${c.id}`,
      collegeId: c.collegeId,
      status: mapBackendCourseStatus(c.status),
    }));
  },

  async getCourses(collegeId: number | string): Promise<Course[]> {
    const isNum = collegeId && !isNaN(Number(collegeId));
    const url = isNum ? `/api/v1/colleges/${collegeId}/courses` : `/api/v1/courses`;
    try {
      const res = await fetchApi<any[]>(url);
      return (res.data || []).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code || `CS ${c.id}`,
        collegeId: c.collegeId,
        status: mapBackendCourseStatus(c.status),
      }));
    } catch {
      return [];
    }
  },

  async getCourse(courseId: number | string): Promise<Course> {
    const res = await fetchApi<any>(`/api/v1/courses/${courseId}`);
    const c = res.data!;
    return {
      id: c.id,
      name: c.name,
      code: c.code || `CS ${c.id}`,
      collegeId: c.collegeId,
      status: mapBackendCourseStatus(c.status),
    };
  },

  async getCourseTopics(courseId: number | string): Promise<Topic[]> {
    const res = await fetchApi<any[]>(`/api/v1/courses/${courseId}/topics`);
    return (res.data || []).map((t: any) => ({
      id: t.id || t.orderIndex,
      name: t.chapterTitle || t.name,
      durationMinutes: Math.round((t.estimatedHours || 2) * 60),
      contentExcerpt: t.contentExcerpt || t.content_excerpt,
    }));
  },

  async addCourseTopic(courseId: number | string, chapterTitle: string, estimatedHours?: number): Promise<Topic> {
    const res = await fetchApi<any>(`/api/v1/courses/${courseId}/topics`, {
      method: "POST",
      body: JSON.stringify({ chapterTitle, estimatedHours }),
    });
    const t = res.data!;
    return {
      id: t.id || t.orderIndex,
      name: t.chapterTitle || chapterTitle,
      durationMinutes: Math.round((t.estimatedHours || 2) * 60),
    };
  },

  async deleteCourseTopic(courseId: number | string, topicId: number | string): Promise<void> {
    await fetchApi<void>(`/api/v1/courses/${courseId}/topics/${topicId}`, {
      method: "DELETE",
    });
  },

  async createCourse(collegeId: number | string, name: string): Promise<Course> {
    const res = await fetchApi<any>(`/api/v1/colleges/${collegeId}/courses`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    const c = res.data!;
    return {
      id: c.id,
      name: c.name,
      code: c.code || "CUSTOM",
      collegeId: c.collegeId,
      status: mapBackendCourseStatus(c.status),
    };
  },

  async joinCourse(
    courseId: number | string,
    params: { examDate: string; dailyHours: number; mode: "normal" | "survival" }
  ): Promise<PlanResponseData> {
    const res = await fetchApi<PlanResponseData>(`/api/v1/courses/${courseId}/join`, {
      method: "POST",
      body: JSON.stringify({
        examDate: params.examDate,
        dailyHours: params.dailyHours,
        mode: params.mode,
      }),
    });
    return res.data!;
  },

  async getCoursePlan(courseId: number | string): Promise<PlanResponseData> {
    const res = await fetchApi<PlanResponseData>(`/api/v1/courses/${courseId}/plan`);
    return res.data!;
  },
};

export const syllabusService = {
  async parseSyllabus(file: File, courseName?: string, courseId?: number | string, languageHint = "auto"): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (courseName) formData.append("course_name", courseName);
    if (courseId && !String(courseId).startsWith("c-") && !String(courseId).startsWith("course-")) {
      formData.append("course_id", String(courseId));
    }
    formData.append("language_hint", languageHint);

    const res = await fetchApi<any>("/api/v1/syllabus/parse", {
      method: "POST",
      body: formData,
    });
    return res.data;
  },
};

export const studyService = {
  async generateStudyKit(courseId: number | string, topicIds: number[]): Promise<any> {
    const res = await fetchApi<any>("/api/v1/study-kits/generate", {
      method: "POST",
      body: JSON.stringify({ courseId, topicIds }),
    });
    return res.data;
  },

  async getDueCards(kitId: string | number, limit?: number): Promise<any[]> {
    const query = limit ? `?limit=${limit}` : "";
    const res = await fetchApi<any[]>(`/api/v1/study-kits/${kitId}/due${query}`);
    return res.data || [];
  },

  async reviewCards(kitId: string | number, items: ReviewItem[]): Promise<ReviewResponse> {
    const submissionId = crypto.randomUUID();
    const res = await fetchApi<ReviewResponse>(`/api/v1/study-kits/${kitId}/review`, {
      method: "POST",
      body: JSON.stringify({ submissionId, items }),
    });
    return res.data!;
  },

  async submitQuiz(
    kitId: string | number,
    answers: { questionId: string; selectedOptionIndex: number }[]
  ): Promise<QuizSubmissionResponse> {
    const submissionId = crypto.randomUUID();
    const res = await fetchApi<QuizSubmissionResponse>(
      `/api/v1/study-kits/${kitId}/quiz-submissions`,
      {
        method: "POST",
        body: JSON.stringify({ submissionId, answers }),
      }
    );
    return res.data!;
  },

  async getProgress(kitId: string | number): Promise<any> {
    const res = await fetchApi<any>(`/api/v1/study-kits/${kitId}/progress`);
    return res.data;
  },
};

export const gamificationService = {
  async getProfile(): Promise<GamificationProfile> {
    const res = await fetchApi<GamificationProfile>("/api/v1/gamification/profile");
    return res.data!;
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await fetchApi<LeaderboardEntry[]>("/api/v1/gamification/leaderboard");
    return res.data || [];
  },
};
