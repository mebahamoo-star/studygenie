import { getUserCourses } from "@/lib/courses-util";
import { daysUntil, loadExams, loadExamsForUser, type Exam } from "@/lib/exam";
import type { Course } from "@/lib/api/types";
import {
  DEFAULT_COURSE_REPORTS,
  DEFAULT_POST_EXAM_ENROLLMENTS,
  MOCK_API_DELAY_MS,
  POST_EXAM_STORAGE_KEY,
  type CourseFeedbackSummaryResponse,
  type CourseReportResponse,
  type EnrollmentStatus,
  type ExamDifficulty,
  type ExamFeedbackPayload,
  type PostExamEnrollment,
  type SyllabusTopicItem,
} from "../constants/postExamConstants";

const POST_EXAM_DISMISSED_KEY = "sg_post_exam_dismissed_ids";

export function getCanonicalExamKey(
  courseNameOrCode: string,
  examDate: string
): string {
  return `${courseNameOrCode.trim().toLowerCase()}::${examDate.trim()}`;
}

interface MockPostExamStore {
  enrollments: PostExamEnrollment[];
  reports: Record<string, CourseReportResponse>;
  feedbackByEnrollment: Record<string, ExamFeedbackPayload>;
  reopenedExamDates?: Record<string, string>;
  seenCelebrationKeys?: Record<string, boolean>;
  submittedFeedbackKeys?: Record<string, boolean>;
}

function createInitialStore(): MockPostExamStore {
  return {
    enrollments: DEFAULT_POST_EXAM_ENROLLMENTS.map((item) => ({
      ...item,
      topics: item.topics.map((t) => ({ ...t })),
    })),
    reports: { ...DEFAULT_COURSE_REPORTS },
    feedbackByEnrollment: {},
    reopenedExamDates: {},
    seenCelebrationKeys: {},
    submittedFeedbackKeys: {},
  };
}

function createEmptyStore(): MockPostExamStore {
  return {
    enrollments: [],
    reports: {},
    feedbackByEnrollment: {},
    reopenedExamDates: {},
    seenCelebrationKeys: {},
    submittedFeedbackKeys: {},
  };
}

let inMemoryFallbackStore: MockPostExamStore = createInitialStore();

function getStorageKey(): string {
  if (typeof window === "undefined") {
    return POST_EXAM_STORAGE_KEY;
  }
  try {
    const raw =
      window.localStorage.getItem("sg_user") ||
      window.localStorage.getItem("sg-user");
    if (raw) {
      const user = JSON.parse(raw) as { id?: number | string; email?: string };
      if (
        user?.id !== undefined &&
        user?.id !== null &&
        String(user.id).trim()
      ) {
        return `${POST_EXAM_STORAGE_KEY}_u_${String(user.id).trim()}`;
      }
      if (user?.email && String(user.email).trim()) {
        return `${POST_EXAM_STORAGE_KEY}_u_${String(user.email)
          .trim()
          .toLowerCase()}`;
      }
    }
  } catch {
    // Fallback to default storage key
  }
  return POST_EXAM_STORAGE_KEY;
}

function hasAuthenticatedUser(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return Boolean(
      window.localStorage.getItem("sg_user") ||
        window.localStorage.getItem("sg-user") ||
        window.localStorage.getItem("sg_access_token")
    );
  } catch {
    return false;
  }
}

function parseExamLabel(raw: string): { parsedCode: string; parsedName: string } {
  const trimmed = raw.trim();
  const dashMatch = trimmed.match(/^(.+?)\s*(?:—|–|\s-\s)\s*(.+)$/);
  if (dashMatch && dashMatch[1] && dashMatch[2]) {
    return { parsedCode: dashMatch[1].trim(), parsedName: dashMatch[2].trim() };
  }
  return { parsedCode: "", parsedName: trimmed };
}

function getAllCandidateCourses(): Course[] {
  const courses = getUserCourses();
  if (courses.length > 0 || typeof window === "undefined") {
    return courses;
  }
  try {
    const guestRaw = window.localStorage.getItem("sg-guest-courses");
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed)) return parsed as Course[];
    }
  } catch {}
  return [];
}

function getAllCandidateExams(): Exam[] {
  const scoped = loadExamsForUser();
  if (scoped.length > 0) return scoped;
  return loadExams();
}

function topicsDiffer(a: SyllabusTopicItem[], b: SyllabusTopicItem[]): boolean {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.title !== b[i]?.title || a[i]?.id !== b[i]?.id) return true;
  }
  return false;
}

function syncRealExamsIntoStore(store: MockPostExamStore): {
  store: MockPostExamStore;
  changed: boolean;
} {
  if (typeof window === "undefined") {
    return { store, changed: false };
  }

  const realExams = getAllCandidateExams();
  if (realExams.length === 0) {
    return { store, changed: false };
  }

  const courses = getAllCandidateCourses();
  const nextEnrollments = store.enrollments.map((item) => ({
    ...item,
    topics: item.topics.map((t) => ({ ...t })),
  }));
  const reopenedExamDates = { ...(store.reopenedExamDates || {}) };
  const seenCelebrationKeys = { ...(store.seenCelebrationKeys || {}) };
  const submittedFeedbackKeys = { ...(store.submittedFeedbackKeys || {}) };
  let changed = false;

  realExams.forEach((exam, idx) => {
    if (!exam.course || !exam.date) return;

    const { parsedCode, parsedName } = parseExamLabel(exam.course);
    const rawNorm = exam.course.trim().toLowerCase();
    const codeNorm = parsedCode.toLowerCase();
    const nameNorm = parsedName.toLowerCase();

    const matchedCourse = courses.find((c) => {
      const cName = c.name.trim().toLowerCase();
      const cCode = (c.code || "").trim().toLowerCase();
      return (
        cName === rawNorm ||
        cName === nameNorm ||
        (cCode !== "" && (cCode === rawNorm || cCode === codeNorm))
      );
    });

    const mappedTopics: SyllabusTopicItem[] = (matchedCourse?.topics || []).map(
      (t, tIdx) => ({
        id: typeof t.id === "number" ? t.id : Number(t.id) || tIdx + 1,
        title: t.name,
        estimatedMinutes: t.durationMinutes || 60,
      })
    );

    const normSlug = rawNorm.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const expectedId = exam.id
      ? `enroll_exam_${exam.id}`
      : `enroll_${normSlug || idx}`;
    const resolvedName = (
      matchedCourse?.name ||
      parsedName ||
      exam.course
    ).trim();
    const resolvedCode = (
      matchedCourse?.code ||
      parsedCode ||
      exam.type ||
      "EXAM"
    ).trim();
    const isExpired = daysUntil(exam.date) < 0;

    const examIdentityKey = getCanonicalExamKey(resolvedName, exam.date);
    const rawIdentityKey = getCanonicalExamKey(exam.course, exam.date);
    const codeIdentityKey =
      resolvedCode !== "" ? getCanonicalExamKey(resolvedCode, exam.date) : "";

    const isAlreadySeen = Boolean(
      seenCelebrationKeys[expectedId] ||
        seenCelebrationKeys[examIdentityKey] ||
        seenCelebrationKeys[rawIdentityKey] ||
        (codeIdentityKey && seenCelebrationKeys[codeIdentityKey])
    );
    const isAlreadySubmitted = Boolean(
      submittedFeedbackKeys[expectedId] ||
        submittedFeedbackKeys[examIdentityKey] ||
        submittedFeedbackKeys[rawIdentityKey] ||
        (codeIdentityKey && submittedFeedbackKeys[codeIdentityKey])
    );

    // Match existing enrollment strictly by ID OR same examDate + courseName/courseCode
    const existingIdx = nextEnrollments.findIndex((e) => {
      if (e.id === expectedId) return true;
      if (e.examDate !== exam.date) return false;
      const eName = e.courseName.trim().toLowerCase();
      const eCode = e.courseCode.trim().toLowerCase();
      if (eName === resolvedName.toLowerCase() || eName === rawNorm) return true;
      if (codeNorm !== "" && eCode === codeNorm) return true;
      return false;
    });

    if (existingIdx === -1) {
      const totalMins =
        mappedTopics.reduce((sum, t) => sum + t.estimatedMinutes, 0) || 180;
      nextEnrollments.push({
        id: expectedId,
        courseId: Number(matchedCourse?.id) || idx + 1000,
        courseName: resolvedName,
        courseCode: resolvedCode,
        status: isExpired ? "COMPLETED" : "ACTIVE",
        examDate: exam.date,
        celebrationSeen: isAlreadySeen || isAlreadySubmitted,
        feedbackSubmitted: isAlreadySubmitted,
        earnedGeniePoints: 150,
        totalStudyHours: Math.max(2, Number((totalMins / 60).toFixed(1))),
        finalRank: null,
        freedWeeklyHours: 4,
        topics: mappedTopics,
      });
      changed = true;
      return;
    }

    const existing = nextEnrollments[existingIdx]!;
    const updated: PostExamEnrollment = { ...existing };
    let itemChanged = false;

    if (existing.examDate !== exam.date) {
      updated.examDate = exam.date;
      itemChanged = true;
    }

    if (mappedTopics.length > 0 && topicsDiffer(existing.topics, mappedTopics)) {
      updated.topics = mappedTopics;
      itemChanged = true;
    }

    if ((isAlreadySeen || isAlreadySubmitted) && !existing.celebrationSeen) {
      updated.celebrationSeen = true;
      itemChanged = true;
    }
    if (isAlreadySubmitted && !existing.feedbackSubmitted) {
      updated.feedbackSubmitted = true;
      updated.celebrationSeen = true;
      itemChanged = true;
    }

    if (!isExpired && existing.status === "COMPLETED") {
      updated.status = "ACTIVE";
      itemChanged = true;
    } else if (
      isExpired &&
      existing.status === "ACTIVE" &&
      reopenedExamDates[existing.id] !== exam.date
    ) {
      updated.status = "COMPLETED";
      itemChanged = true;
    }

    if (itemChanged) {
      nextEnrollments[existingIdx] = updated;
      changed = true;
    }
  });

  if (!changed) {
    return { store, changed: false };
  }

  return {
    store: {
      ...store,
      enrollments: nextEnrollments,
      reopenedExamDates,
      seenCelebrationKeys,
      submittedFeedbackKeys,
    },
    changed: true,
  };
}

function readStore(): MockPostExamStore {
  if (typeof window === "undefined") {
    return inMemoryFallbackStore;
  }
  const storageKey = getStorageKey();
  try {
    const raw = window.localStorage.getItem(storageKey);
    let baseStore: MockPostExamStore;
    let shouldPersist = false;

    if (!raw) {
      baseStore = hasAuthenticatedUser()
        ? createEmptyStore()
        : createInitialStore();
      shouldPersist = true;
    } else {
      const parsed = JSON.parse(raw) as MockPostExamStore;
      if (!Array.isArray(parsed.enrollments)) {
        baseStore = hasAuthenticatedUser()
          ? createEmptyStore()
          : createInitialStore();
        shouldPersist = true;
      } else {
        baseStore = parsed;
      }
    }

    const synced = syncRealExamsIntoStore(baseStore);
    if (shouldPersist || synced.changed) {
      writeStore(synced.store);
    }
    return synced.store;
  } catch {
    return inMemoryFallbackStore;
  }
}

function writeStore(next: MockPostExamStore): void {
  inMemoryFallbackStore = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(getStorageKey(), JSON.stringify(next));
    } catch {
      // Ignore storage quota errors in mock layer
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockPostExamApi = {
  async getEnrollments(status?: EnrollmentStatus): Promise<PostExamEnrollment[]> {
    await delay(MOCK_API_DELAY_MS);
    const store = readStore();
    const list = status
      ? store.enrollments.filter((item) => item.status === status)
      : store.enrollments;
    return list.map((item) => ({
      ...item,
      topics: item.topics.map((t) => ({ ...t })),
    }));
  },

  async markCelebrationSeen(enrollmentId: string): Promise<{ success: boolean }> {
    await delay(MOCK_API_DELAY_MS);
    const store = readStore();
    const idx = store.enrollments.findIndex((e) => e.id === enrollmentId);
    const seenKeys: Record<string, boolean> = {
      ...(store.seenCelebrationKeys || {}),
      [enrollmentId]: true,
    };
    if (idx !== -1) {
      const target = store.enrollments[idx]!;
      seenKeys[getCanonicalExamKey(target.courseName, target.examDate)] = true;
      seenKeys[getCanonicalExamKey(target.courseCode, target.examDate)] = true;
      store.enrollments[idx] = {
        ...target,
        celebrationSeen: true,
      };
    }
    store.seenCelebrationKeys = seenKeys;
    writeStore(store);
    return { success: true };
  },

  async submitFeedback(
    enrollmentId: string,
    payload: ExamFeedbackPayload
  ): Promise<{ success: boolean }> {
    await delay(MOCK_API_DELAY_MS);
    const store = readStore();
    const idx = store.enrollments.findIndex((e) => e.id === enrollmentId);
    store.feedbackByEnrollment[enrollmentId] = {
      courseId: payload.courseId ?? (idx !== -1 ? store.enrollments[idx]!.courseId : undefined),
      courseName: payload.courseName ?? (idx !== -1 ? store.enrollments[idx]!.courseName : undefined),
      difficulty: payload.difficulty,
      hardTopicIds: [...payload.hardTopicIds],
      testedTopicIds: [...payload.testedTopicIds],
    };
    const seenKeys: Record<string, boolean> = {
      ...(store.seenCelebrationKeys || {}),
      [enrollmentId]: true,
    };
    const submittedKeys: Record<string, boolean> = {
      ...(store.submittedFeedbackKeys || {}),
      [enrollmentId]: true,
    };
    if (idx !== -1) {
      const target = store.enrollments[idx]!;
      const nameKey = getCanonicalExamKey(target.courseName, target.examDate);
      const codeKey = getCanonicalExamKey(target.courseCode, target.examDate);
      seenKeys[nameKey] = true;
      seenKeys[codeKey] = true;
      submittedKeys[nameKey] = true;
      submittedKeys[codeKey] = true;
      store.enrollments[idx] = {
        ...target,
        feedbackSubmitted: true,
        celebrationSeen: true,
      };
    }
    store.seenCelebrationKeys = seenKeys;
    store.submittedFeedbackKeys = submittedKeys;
    writeStore(store);
    return { success: true };
  },

  async getCourseReport(enrollmentId: string): Promise<CourseReportResponse> {
    await delay(MOCK_API_DELAY_MS);
    const store = readStore();
    const existing = store.reports[enrollmentId];
    if (existing) {
      return {
        ...existing,
        weekly: existing.weekly.map((w) => ({ ...w })),
        slowTopics: existing.slowTopics.map((s) => ({ ...s })),
      };
    }

    const enrollment = store.enrollments.find(
      (e) => e.id === enrollmentId || String(e.courseId) === String(enrollmentId)
    );
    if (!enrollment) {
      throw new Error(`Report for enrollment "${enrollmentId}" not found`);
    }

    // Fallback synthesized report matching exact contract shape
    return {
      courseName: enrollment.courseName,
      totalStudyHours: enrollment.totalStudyHours || 12,
      sessionsCount: Math.max(4, Math.round((enrollment.totalStudyHours || 12) * 0.75)),
      adherencePercent: 80,
      longestStreak: 5,
      // TODO(backend): Replace mock finalRank with real course leaderboard rank when endpoint exists
      finalRank: enrollment.finalRank ?? null,
      weekly: [
        { weekLabel: "Week 1", plannedHours: 4, actualHours: 3.5 },
        { weekLabel: "Week 2", plannedHours: 5, actualHours: 4.5 },
        { weekLabel: "Week 3", plannedHours: 5, actualHours: 4.0 },
      ],
      slowTopics: enrollment.topics.slice(0, 2).map((t) => ({
        topicId: t.id,
        title: t.title,
        plannedMinutes: t.estimatedMinutes,
        actualMinutes: Math.round(t.estimatedMinutes * 1.3),
      })),
    };
  },

  async reopenEnrollment(enrollmentId: string): Promise<PostExamEnrollment> {
    await delay(MOCK_API_DELAY_MS);
    const store = readStore();
    const idx = store.enrollments.findIndex((e) => e.id === enrollmentId);
    if (idx === -1) {
      throw new Error(`Enrollment "${enrollmentId}" not found`);
    }
    const target = store.enrollments[idx]!;
    const updated: PostExamEnrollment = {
      ...target,
      status: "ACTIVE",
    };
    store.enrollments[idx] = updated;
    store.reopenedExamDates = {
      ...(store.reopenedExamDates || {}),
      [enrollmentId]: target.examDate,
    };
    writeStore(store);
    return updated;
  },

  archiveEnrollment(enrollmentId: string): Promise<PostExamEnrollment> {
    return this._archiveEnrollment(enrollmentId);
  },

  getCourseFeedbackSummary(courseNameOrId: string | number): CourseFeedbackSummaryResponse {
    const store = readStore();
    const query = String(courseNameOrId || "").trim().toLowerCase();
    
    const matchingEnrollments = store.enrollments.filter((e) => {
      if (String(e.courseId) === query || e.id.toLowerCase() === query) return true;
      if (query && (e.courseName.toLowerCase().includes(query) || e.courseCode.toLowerCase().includes(query))) return true;
      return false;
    });

    const diffCounts: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
    const testedSet = new Set<number>();
    const hardSet = new Set<number>();
    let totalSubmissions = 0;

    const targetEnrollmentIds = matchingEnrollments.length > 0 
      ? matchingEnrollments.map((e) => e.id)
      : Object.keys(store.feedbackByEnrollment);

    for (const id of targetEnrollmentIds) {
      const fb = store.feedbackByEnrollment[id];
      if (fb) {
        totalSubmissions++;
        const d = (fb.difficulty || "MEDIUM").toUpperCase();
        diffCounts[d] = (diffCounts[d] || 0) + 1;
        (fb.testedTopicIds || []).forEach((tId) => testedSet.add(Number(tId)));
        (fb.hardTopicIds || []).forEach((hId) => hardSet.add(Number(hId)));
      }
    }

    let dominant: ExamDifficulty = "MEDIUM";
    let maxCount = -1;
    for (const [diff, count] of Object.entries(diffCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = diff as ExamDifficulty;
      }
    }

    const firstMatch = matchingEnrollments[0];
    return {
      courseName: firstMatch?.courseName || String(courseNameOrId),
      dominantDifficulty: dominant,
      totalSubmissions,
      heavilyTestedTopicIds: Array.from(testedSet),
      hardTopicIds: Array.from(hardSet),
      difficultyCounts: diffCounts,
    };
  },

  async _archiveEnrollment(enrollmentId: string): Promise<PostExamEnrollment> {
    await delay(MOCK_API_DELAY_MS);
    const store = readStore();
    const idx = store.enrollments.findIndex((e) => e.id === enrollmentId);
    if (idx === -1) {
      throw new Error(`Enrollment "${enrollmentId}" not found`);
    }
    const updated: PostExamEnrollment = {
      ...store.enrollments[idx]!,
      status: "ARCHIVED",
    };
    store.enrollments[idx] = updated;
    writeStore(store);
    return updated;
  },

  resetMockPostExamState(): PostExamEnrollment[] {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(POST_EXAM_DISMISSED_KEY);
      } catch {}
    }
    const fresh = createInitialStore();
    writeStore(fresh);
    return fresh.enrollments;
  },
};
