import { fetchApi, clearAuthSession, getStoredRefreshToken, saveAuthSession } from "./client";

import type {
  AccountStatus,
  AdminAuditLogDto,
  AdminCollegeDto,
  AdminCourseDto,
  AdminOverviewDto,
  AdminPageResponse,
  AdminReportDto,
  AdminTopicDto,
  AdminUniversityDto,
  AdminUserDto,
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
  UserRole,
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

  async login(email: string, password: string, rememberMe = false): Promise<AuthResponse> {
    const res = await fetchApi<AuthResponse>("/api/auth/login", {
      method: "POST",

      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (res.data) saveAuthSession(res.data);

    return res.data!;
  },

  async forgotPassword(email: string): Promise<void> {
    await fetchApi("/api/auth/forgot-password", {
      method: "POST",

      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await fetchApi("/api/auth/reset-password", {
      method: "POST",

      body: JSON.stringify({ email, code, newPassword }),
    });
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
    const url = redirectUri
      ? `/api/auth/oauth/info?redirectUri=${encodeURIComponent(redirectUri)}`
      : "/api/auth/oauth/info";

    const res = await fetchApi<{
      googleConfigured: boolean;

      microsoftConfigured: boolean;

      googleAuthUrl: string;

      microsoftAuthUrl: string;
    }>(url);

    return (
      res.data || {
        googleConfigured: false,
        microsoftConfigured: false,
        googleAuthUrl: "",
        microsoftAuthUrl: "",
      }
    );
  },

  async oauthLogin(
    provider: "google" | "microsoft",
    code?: string,
    idToken?: string,
    redirectUri?: string,
  ): Promise<AuthResponse> {
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

  async createUniversity(name: string, city?: string): Promise<University> {
    const res = await fetchApi<University>("/api/v1/universities", {
      method: "POST",

      body: JSON.stringify({ name, city }),
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

  async resetCourseSyllabus(courseId: number | string): Promise<void> {
    await fetchApi<void>(`/api/v1/courses/${courseId}/syllabus`, {
      method: "DELETE",
    });
  },

  async reportCourse(data: {
    courseId?: number | string | null;
    courseName: string;
    reason: string;
    details?: string;
    reportedBy?: string;
  }): Promise<any> {
    return courseReportService.reportCourse(data);
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

  async addCourseTopic(
    courseId: number | string,
    chapterTitle: string,
    estimatedHours?: number,
  ): Promise<Topic> {
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

      code: c.code && String(c.code).trim().toUpperCase() !== "CUSTOM" ? c.code : "",

      collegeId: c.collegeId,

      status: mapBackendCourseStatus(c.status),
    };
  },

  async joinCourse(
    courseId: number | string,
    params: {
      examDate: string;
      dailyHours: number;
      mode: "normal" | "survival";
      selectedTopicIds?: (number | string)[];
    },
  ): Promise<PlanResponseData> {
    const res = await fetchApi<PlanResponseData>(`/api/v1/courses/${courseId}/join`, {
      method: "POST",
      body: JSON.stringify({
        examDate: params.examDate,
        dailyHours: params.dailyHours,
        mode: params.mode,
        selected_topic_ids: params.selectedTopicIds,
      }),
    });

    return res.data!;
  },

  async generateOrUpdatePlan(
    courseId: number | string,
    params: {
      examDate: string;
      dailyHours: number;
      mode: "normal" | "survival";
      selectedTopicIds?: (number | string)[];
    },
  ): Promise<PlanResponseData> {
    const res = await fetchApi<PlanResponseData>(`/api/v1/courses/${courseId}/plan`, {
      method: "POST",
      body: JSON.stringify({
        examDate: params.examDate,
        dailyHours: params.dailyHours,
        mode: params.mode,
        selected_topic_ids: params.selectedTopicIds,
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
  async parseSyllabus(
    file: File,
    courseName?: string,
    courseId?: number | string,
    languageHint = "auto",
  ): Promise<any> {
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

    answers: { questionId: string; selectedOptionIndex: number }[],
  ): Promise<QuizSubmissionResponse> {
    const submissionId = crypto.randomUUID();

    const res = await fetchApi<QuizSubmissionResponse>(
      `/api/v1/study-kits/${kitId}/quiz-submissions`,

      {
        method: "POST",

        body: JSON.stringify({ submissionId, answers }),
      },
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

  async syncProgress(data: { points?: number; streak?: number }): Promise<GamificationProfile> {
    const res = await fetchApi<GamificationProfile>("/api/v1/gamification/sync", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const res = await fetchApi<LeaderboardEntry[]>("/api/v1/gamification/leaderboard");
    return res.data || [];
  },
};

export interface RemoteExam {
  id: number;
  course: string;
  type: string;
  date: string;
  professor?: string;
  uploaderName?: string;
  uploader_name?: string;
  studentId?: number;
  student_id?: number;
  courseId?: number;
  course_id?: number;
}

export interface CommunityChallenge {
  id?: number | null;
  courseId?: number | null;
  courseName: string;
  examType: string;
  examDate: string;
  professor?: string;
  uploaderName?: string;
  universityName?: string;
  collegeName?: string;
  hasSyllabus?: boolean;
  chaptersCount?: number;
  peerCount?: number;
  isJoined?: boolean;
}

export const examService = {
  async getCommunityChallenges(collegeId?: number | string): Promise<CommunityChallenge[]> {
    try {
      const url = collegeId
        ? `/api/v1/exams/challenges?college_id=${collegeId}`
        : "/api/v1/exams/challenges";
      const res = await fetchApi<any[]>(url);
      if (!res.data) return [];
      return res.data.map((item: any) => ({
        id: item.id,
        courseId: item.course_id || item.courseId,
        courseName: item.course_name || item.courseName || item.course,
        examType: item.exam_type || item.examType || item.type || "Midterm Exam",
        examDate: item.exam_date || item.examDate || item.date,
        professor: item.professor || "Faculty",
        uploaderName: item.uploader_name || item.uploaderName || "Classmate",
        universityName: item.university_name || item.universityName,
        collegeName: item.college_name || item.collegeName,
        hasSyllabus: item.has_syllabus ?? item.hasSyllabus ?? false,
        chaptersCount: item.chapters_count || item.chaptersCount || 0,
        peerCount: item.peer_count || item.peerCount || 1,
        isJoined: item.is_joined ?? item.isJoined ?? false,
      }));
    } catch {
      return [];
    }
  },

  async getExams(): Promise<RemoteExam[]> {
    const res = await fetchApi<RemoteExam[]>("/api/v1/exams");
    return res.data || [];
  },

  async createExam(data: {
    course: string;
    type: string;
    date: string;
    professor?: string;
    uploaderName?: string;
    studentEmail?: string;
    courseId?: number | string;
  }): Promise<RemoteExam> {
    const payload = {
      course: data.course,
      type: data.type,
      date: data.date,
      professor: data.professor,
      uploader_name: data.uploaderName,
      student_email: data.studentEmail,
      course_id:
        data.courseId != null && !isNaN(Number(data.courseId)) ? Number(data.courseId) : undefined,
    };
    const res = await fetchApi<RemoteExam>("/api/v1/exams", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async deleteExam(id: number | string): Promise<void> {
    await fetchApi<void>("/api/v1/exams/" + id, {
      method: "DELETE",
    });
  },
};

export const courseReportService = {
  async reportCourse(data: {
    courseId?: number | string | null;
    courseName: string;
    reason: string;
    details?: string;
    reportedBy?: string;
  }): Promise<any> {
    const cid =
      data.courseId &&
      !String(data.courseId).startsWith("c-") &&
      !String(data.courseId).startsWith("course-")
        ? Number(data.courseId)
        : null;
    const res = await fetchApi<any>("/api/v1/courses/report", {
      method: "POST",
      body: JSON.stringify({
        course_id: cid,
        course_name: data.courseName,
        reason: data.reason,
        details: data.details || "",
        reported_by: data.reportedBy || "",
      }),
    });
    return res.data;
  },

  async getReports(): Promise<any[]> {
    const res = await fetchApi<any[]>("/api/v1/courses/reports");
    return res.data || [];
  },
};

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      searchParams.set(key, String(val));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export const adminService = {
  async getOverview(): Promise<AdminOverviewDto> {
    const res = await fetchApi<AdminOverviewDto>("/api/admin/overview");
    return res.data!;
  },

  async getReports(
    params: {
      status?: string;
      reason?: string;
      courseId?: number;
      search?: string;
      page?: number;
      size?: number;
    } = {},
  ): Promise<AdminPageResponse<AdminReportDto>> {
    const res = await fetchApi<AdminPageResponse<AdminReportDto>>(
      `/api/admin/reports${buildQuery(params)}`,
    );
    return res.data!;
  },

  async getReport(id: number): Promise<AdminReportDto> {
    const res = await fetchApi<AdminReportDto>(`/api/admin/reports/${id}`);
    return res.data!;
  },

  async updateReport(
    id: number,
    payload: { status?: string; adminNote?: string },
  ): Promise<AdminReportDto> {
    const res = await fetchApi<AdminReportDto>(`/api/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async getCourses(
    params: {
      universityId?: number;
      collegeId?: number;
      status?: string;
      minEnrollments?: number;
      minTopics?: number;
      search?: string;
      includeDeleted?: boolean;
      page?: number;
      size?: number;
    } = {},
  ): Promise<AdminPageResponse<AdminCourseDto>> {
    const res = await fetchApi<AdminPageResponse<AdminCourseDto>>(
      `/api/admin/courses${buildQuery(params)}`,
    );
    return res.data!;
  },

  async getCourse(id: number | string): Promise<AdminCourseDto> {
    const res = await fetchApi<AdminCourseDto>(`/api/admin/courses/${id}`);
    return res.data!;
  },

  async getCourseById(id: number | string): Promise<AdminCourseDto> {
    return this.getCourse(id);
  },

  async updateCourse(
    id: number | string,
    payload: {
      code?: string;
      name?: string;
      collegeId?: number;
      status?: string;
      verified?: boolean;
      locked?: boolean;
    },
  ): Promise<AdminCourseDto> {
    const res = await fetchApi<AdminCourseDto>(`/api/admin/courses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async deleteCourse(id: number | string): Promise<void> {
    await fetchApi<void>(`/api/admin/courses/${id}`, {
      method: "DELETE",
    });
  },

  async mergeCourse(
    sourceCourseId: number | string,
    targetCourseId: number | string,
  ): Promise<AdminCourseDto> {
    const res = await fetchApi<AdminCourseDto>(`/api/admin/courses/${sourceCourseId}/merge`, {
      method: "POST",
      body: JSON.stringify({ targetCourseId: Number(targetCourseId) }),
    });
    return res.data!;
  },

  async mergeCourses(
    sourceCourseId: number | string,
    targetCourseId: number | string,
  ): Promise<AdminCourseDto> {
    return this.mergeCourse(sourceCourseId, targetCourseId);
  },

  async reanalyzeCourse(id: number | string): Promise<AdminCourseDto> {
    const res = await fetchApi<AdminCourseDto>(`/api/admin/courses/${id}/reanalyze`, {
      method: "POST",
    });
    return res.data!;
  },

  async updateTopic(
    courseId: number | string,
    topicId: number | string,
    payload: {
      chapterTitle?: string;
      title?: string;
      estimatedHours?: number;
      orderIndex?: number;
      weekNumber?: number;
    },
  ): Promise<AdminTopicDto> {
    const body = {
      chapterTitle: payload.chapterTitle ?? payload.title,
      estimatedHours: payload.estimatedHours,
      orderIndex: payload.orderIndex ?? payload.weekNumber,
    };
    const res = await fetchApi<AdminTopicDto>(`/api/admin/courses/${courseId}/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.data!;
  },

  async updateCourseTopic(
    courseId: number | string,
    topicId: number | string,
    payload: {
      chapterTitle?: string;
      title?: string;
      estimatedHours?: number;
      orderIndex?: number;
      weekNumber?: number;
    },
  ): Promise<AdminTopicDto> {
    return this.updateTopic(courseId, topicId, payload);
  },

  async deleteTopic(courseId: number | string, topicId: number | string): Promise<void> {
    await fetchApi<void>(`/api/admin/courses/${courseId}/topics/${topicId}`, {
      method: "DELETE",
    });
  },

  async deleteCourseTopic(courseId: number | string, topicId: number | string): Promise<void> {
    return this.deleteTopic(courseId, topicId);
  },

  async listUniversities(): Promise<AdminUniversityDto[]> {
    const res = await fetchApi<AdminUniversityDto[]>("/api/admin/universities");
    return res.data || [];
  },

  async createUniversity(
    input: string | { name: string; city?: string; website?: string },
  ): Promise<AdminUniversityDto> {
    const name = typeof input === "string" ? input : input.name;
    const city = typeof input === "object" ? input.city : undefined;
    const res = await fetchApi<AdminUniversityDto>("/api/admin/universities", {
      method: "POST",
      body: JSON.stringify({ name, city }),
    });
    return res.data!;
  },

  async updateUniversity(
    id: number | string,
    input: string | { name: string; city?: string },
  ): Promise<AdminUniversityDto> {
    const payload = typeof input === "string" ? { name: input } : input;
    const res = await fetchApi<AdminUniversityDto>(`/api/admin/universities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async deleteUniversity(id: number | string): Promise<void> {
    await fetchApi<void>(`/api/admin/universities/${id}`, {
      method: "DELETE",
    });
  },

  async listColleges(universityId?: number | string): Promise<AdminCollegeDto[]> {
    const res = await fetchApi<AdminCollegeDto[]>(
      `/api/admin/colleges${buildQuery({ universityId })}`,
    );
    return res.data || [];
  },

  async createCollege(
    universityIdOrPayload: number | string | { universityId: number | string; name: string },
    maybeName?: string,
  ): Promise<AdminCollegeDto> {
    const payload =
      typeof universityIdOrPayload === "object"
        ? {
            universityId: Number(universityIdOrPayload.universityId),
            name: universityIdOrPayload.name,
          }
        : { universityId: Number(universityIdOrPayload), name: maybeName || "" };
    const res = await fetchApi<AdminCollegeDto>("/api/admin/colleges", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  async updateCollege(id: number, universityId: number, name: string): Promise<AdminCollegeDto> {
    const res = await fetchApi<AdminCollegeDto>(`/api/admin/colleges/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ universityId, name }),
    });
    return res.data!;
  },

  async deleteCollege(id: number | string): Promise<void> {
    await fetchApi<void>(`/api/admin/colleges/${id}`, {
      method: "DELETE",
    });
  },

  async getUsers(
    params: {
      search?: string;
      role?: string;
      status?: string;
      universityId?: number;
      page?: number;
      size?: number;
    } = {},
  ): Promise<AdminPageResponse<AdminUserDto>> {
    const res = await fetchApi<AdminPageResponse<AdminUserDto>>(
      `/api/admin/users${buildQuery(params)}`,
    );
    return res.data!;
  },

  async getUser(id: number): Promise<AdminUserDto> {
    const res = await fetchApi<AdminUserDto>(`/api/admin/users/${id}`);
    return res.data!;
  },

  async updateUserRole(id: number | string, role: UserRole): Promise<AdminUserDto> {
    const res = await fetchApi<AdminUserDto>(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    return res.data!;
  },

  async updateUserStatus(id: number | string, status: AccountStatus): Promise<AdminUserDto> {
    const res = await fetchApi<AdminUserDto>(`/api/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return res.data!;
  },

  async resetUserPassword(id: number | string): Promise<{ message: string }> {
    const res = await fetchApi<void>(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
    });
    return { message: res.message || "Password reset email triggered" };
  },

  async triggerPasswordReset(id: number | string): Promise<{ message: string }> {
    return this.resetUserPassword(id);
  },

  async getAuditLogs(
    params: {
      adminId?: number;
      action?: string;
      targetType?: string;
      search?: string;
      page?: number;
      size?: number;
    } = {},
  ): Promise<AdminPageResponse<AdminAuditLogDto>> {
    const res = await fetchApi<AdminPageResponse<AdminAuditLogDto>>(
      `/api/admin/audit-log${buildQuery(params)}`,
    );
    return res.data!;
  },
};
