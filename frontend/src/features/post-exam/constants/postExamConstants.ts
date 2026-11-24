export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type ExamDifficulty = "EASY" | "MEDIUM" | "HARD";

export interface SyllabusTopicItem {
  id: number;
  title: string;
  titleAr?: string;
  estimatedMinutes: number;
}

export interface PostExamEnrollment {
  id: string;
  courseId: number;
  courseName: string;
  courseNameAr?: string;
  courseCode: string;
  status: EnrollmentStatus;
  examDate: string;
  celebrationSeen: boolean;
  feedbackSubmitted: boolean;
  earnedGeniePoints: number;
  totalStudyHours: number;
  finalRank: number | null;
  freedWeeklyHours: number;
  topics: SyllabusTopicItem[];
}

export interface ExamFeedbackPayload {
  difficulty: ExamDifficulty;
  hardTopicIds: number[];
  testedTopicIds: number[];
}

export interface WeeklyHoursPoint {
  weekLabel: string;
  plannedHours: number;
  actualHours: number;
}

export interface SlowTopicItem {
  topicId: number;
  title: string;
  plannedMinutes: number;
  actualMinutes: number;
}

export interface CourseReportResponse {
  courseName: string;
  totalStudyHours: number;
  sessionsCount: number;
  adherencePercent: number;
  longestStreak: number;
  finalRank: number | null;
  weekly: WeeklyHoursPoint[];
  slowTopics: SlowTopicItem[];
}

export interface CourseFeedbackSummaryResponse {
  courseName: string;
  dominantDifficulty: ExamDifficulty;
  totalSubmissions: number;
  heavilyTestedTopicIds: number[];
  hardTopicIds: number[];
  difficultyCounts: Record<string, number>;
}

export const POST_EXAM_STORAGE_KEY = "sg_post_exam_mock_state_v1";
export const MOCK_API_DELAY_MS = 250;
export const CELEBRATION_COUNTUP_DURATION_MS = 1200;
export const CELEBRATION_COUNTUP_STEPS = 24;
export const TOPIC_SEARCH_THRESHOLD = 5;
export const LONG_STREAK_REST_THRESHOLD_DAYS = 7;
export const CELEBRATION_LOTTIE_ASSET_PATH = "/assets/genie-celebrate.json";
export const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const DEFAULT_POST_EXAM_ENROLLMENTS: PostExamEnrollment[] = [
  {
    id: "enroll_cs305",
    courseId: 305,
    courseName: "Database Management Systems",
    courseNameAr: "نظم إدارة قواعد البيانات",
    courseCode: "CS 305",
    status: "COMPLETED",
    examDate: "2026-11-18",
    celebrationSeen: false,
    feedbackSubmitted: false,
    earnedGeniePoints: 450,
    totalStudyHours: 24.5,
    finalRank: 3,
    freedWeeklyHours: 6,
    topics: [
      { id: 1, title: "Relational Algebra & Calculus", titleAr: "الجبر العلائقي والحساب", estimatedMinutes: 120 },
      { id: 2, title: "Entity-Relationship Modeling", titleAr: "نمذجة الكيانات والعلاقات", estimatedMinutes: 90 },
      { id: 3, title: "SQL Joins & Subqueries", titleAr: "استعلامات SQL والربط", estimatedMinutes: 150 },
      { id: 4, title: "Functional Dependencies & BCNF", titleAr: "التبعيات الوظيفية والتطبيع BCNF", estimatedMinutes: 180 },
      { id: 5, title: "B+ Tree & Hash Indexing", titleAr: "فهارس B+ Tree والتجزئة", estimatedMinutes: 160 },
      { id: 6, title: "Query Optimization Plans", titleAr: "خطط تحسين الاستعلامات", estimatedMinutes: 140 },
      { id: 7, title: "ACID & Two-Phase Locking", titleAr: "خصائص ACID والإقفال ثنائي الطور", estimatedMinutes: 150 },
      { id: 8, title: "ARIES Crash Recovery", titleAr: "استعادة النظام ARIES", estimatedMinutes: 110 },
    ],
  },
  {
    id: "enroll_cs311",
    courseId: 311,
    courseName: "Design & Analysis of Algorithms",
    courseNameAr: "تصميم وتحليل الخوارزميات",
    courseCode: "CS 311",
    status: "ACTIVE",
    examDate: "2026-12-02",
    celebrationSeen: false,
    feedbackSubmitted: false,
    earnedGeniePoints: 320,
    totalStudyHours: 16,
    finalRank: 5,
    freedWeeklyHours: 0,
    topics: [
      { id: 11, title: "Asymptotic Analysis & Recurrences", titleAr: "التحليل التقاربي والتكرارات", estimatedMinutes: 120 },
      { id: 12, title: "Dynamic Programming", titleAr: "البرمجة الديناميكية", estimatedMinutes: 180 },
      { id: 13, title: "Graph Shortest Paths", titleAr: "أقصر المسارات في الرسوم البيانية", estimatedMinutes: 150 },
    ],
  },
  {
    id: "enroll_math244",
    courseId: 244,
    courseName: "Linear Algebra",
    courseNameAr: "الجبر الخطي",
    courseCode: "MATH 244",
    status: "COMPLETED",
    examDate: "2026-11-10",
    celebrationSeen: true,
    feedbackSubmitted: true,
    earnedGeniePoints: 380,
    totalStudyHours: 19.2,
    finalRank: 7,
    freedWeeklyHours: 5,
    topics: [
      { id: 21, title: "Vector Spaces & Subspaces", titleAr: "الفضاءات المتجهة", estimatedMinutes: 110 },
      { id: 22, title: "Eigenvalues & Diagonalization", titleAr: "القيم الذاتية والتقطير", estimatedMinutes: 140 },
    ],
  },
  {
    id: "enroll_phys101",
    courseId: 101,
    courseName: "General Physics I",
    courseNameAr: "الفيزياء العامة ١",
    courseCode: "PHYS 101",
    status: "ARCHIVED",
    examDate: "2026-10-20",
    celebrationSeen: true,
    feedbackSubmitted: true,
    earnedGeniePoints: 290,
    totalStudyHours: 14.5,
    finalRank: 12,
    freedWeeklyHours: 4,
    topics: [
      { id: 31, title: "Kinematics in Two Dimensions", titleAr: "الحركيات في بعدين", estimatedMinutes: 100 },
      { id: 32, title: "Conservation of Momentum", titleAr: "حفظ كمية الحركة", estimatedMinutes: 120 },
    ],
  },
];

export const DEFAULT_COURSE_REPORTS: Record<string, CourseReportResponse> = {
  enroll_cs305: {
    courseName: "Database Management Systems",
    totalStudyHours: 24.5,
    sessionsCount: 18,
    adherencePercent: 86,
    longestStreak: 9,
    finalRank: 3,
    weekly: [
      { weekLabel: "Week 1", plannedHours: 5.5, actualHours: 5.0 },
      { weekLabel: "Week 2", plannedHours: 6.0, actualHours: 5.8 },
      { weekLabel: "Week 3", plannedHours: 7.0, actualHours: 6.2 },
      { weekLabel: "Week 4", plannedHours: 8.0, actualHours: 7.5 },
    ],
    slowTopics: [
      {
        topicId: 4,
        title: "Functional Dependencies & BCNF",
        plannedMinutes: 180,
        actualMinutes: 255,
      },
      {
        topicId: 5,
        title: "B+ Tree & Hash Indexing",
        plannedMinutes: 160,
        actualMinutes: 215,
      },
      {
        topicId: 7,
        title: "ACID & Two-Phase Locking",
        plannedMinutes: 150,
        actualMinutes: 190,
      },
    ],
  },
  enroll_math244: {
    courseName: "Linear Algebra",
    totalStudyHours: 19.2,
    sessionsCount: 14,
    adherencePercent: 82,
    longestStreak: 6,
    finalRank: 7,
    weekly: [
      { weekLabel: "Week 1", plannedHours: 5.0, actualHours: 4.5 },
      { weekLabel: "Week 2", plannedHours: 6.0, actualHours: 5.2 },
      { weekLabel: "Week 3", plannedHours: 7.0, actualHours: 6.0 },
      { weekLabel: "Week 4", plannedHours: 4.0, actualHours: 3.5 },
    ],
    slowTopics: [
      {
        topicId: 22,
        title: "Eigenvalues & Diagonalization",
        plannedMinutes: 140,
        actualMinutes: 195,
      },
    ],
  },
};
