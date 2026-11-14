export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export type UserRole = "STUDENT" | "MODERATOR" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED";

export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  role?: UserRole;
  status?: AccountStatus;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  user: UserSummary;
}

export interface University {
  id: number;
  name: string;
  city?: string | null;
}

export interface College {
  id: number;
  name: string;
  universityId: number;
}

export type CourseStatus = "ready" | "none" | "processing";

export interface Course {
  id: string | number;
  name: string;
  code?: string;
  collegeId?: number;
  status: CourseStatus;
  topics?: Topic[];
}

export interface Topic {
  id: number;
  name: string;
  weekNumber?: number;
  importance?: number;
  durationMinutes?: number;
  subtopics?: string[] | any[];
  contentExcerpt?: string;
  fileName?: string;
  fileIndex?: number;
}

export interface PlanTask {
  date: string;
  topic_ref?: string;
  topicRef?: string;
  topic_title?: string;
  topicTitle?: string;
  task_type?: string;
  taskType?: string;
  minutes: number;
  description?: string;
  subtopics?: string[];
  // UI helper mappings:
  t?: string;
  tag?: string;
  min?: number;
}

export interface PlanSummary {
  mode: string;
  study_days: number;
  capacity_minutes: number;
  planned_minutes: number;
  planned_topics: number;
  skipped_count: number;
  feasible: boolean;
  warnings?: string[];
}

export interface PlanResponseData {
  tasks: PlanTask[];
  skippedTopics?: any[];
  summary: PlanSummary;
}

export interface Flashcard {
  cardId: string;
  front: string;
  back: string;
}

export type Sm2Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface ReviewItem {
  cardId: string;
  rating: Sm2Rating;
}

export interface ReviewResponse {
  reviewed: number;
  counted: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
}

export interface ProgressResponse {
  newCount?: number;
  learningCount?: number;
  matureCount?: number;
  totalCards?: number;
}

export interface ClientQuizQuestion {
  questionId: string;
  type?: string;
  question: string;
  options: string[];
}

export interface QuizSubmissionResponse {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  xpEligible: boolean;
  results: {
    questionId: string;
    correct: boolean;
    correctOptionIndex: number;
    explanation: string;
  }[];
}

export interface GamificationProfile {
  userId: number;
  displayName: string;
  currentXp: number;
  currentLevel: number;
  currentStreakDays: number;
  longestStreakDays: number;
  unlockedBadges: {
    id: string;
    name: string;
    description: string;
    unlockedAt?: string;
  }[];
}

export interface LeaderboardEntry {
  displayName: string;
  xp: number;
  level: number;
  uni?: string;
  me?: boolean;
}

export interface CourseReport {
  id?: number;
  courseId?: number | string;
  courseName: string;
  reason: string;
  details?: string;
  reportedBy?: string;
  status?: string;
  createdAt?: string;
}

export interface AdminPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DailyMetricPoint {
  date: string;
  count: number;
}

export interface AdminOverviewDto {
  totalUsers: number;
  activeUsersToday: number;
  activeUsers7d: number;
  newSignupsToday: number;
  newSignups7d: number;
  totalCourses: number;
  enrolledCount: number;
  uploadsToday: number;
  openReports: number;
  failedAnalyses: number;
  dailySignups: DailyMetricPoint[];
  dailyActivity: DailyMetricPoint[];
}

export interface AdminReportDto {
  id: number;
  courseId?: number | null;
  courseCode?: string | null;
  courseName: string;
  universityName?: string | null;
  studentId?: number | null;
  studentName?: string | null;
  studentEmail?: string | null;
  reportedBy?: string | null;
  reason: string;
  details?: string | null;
  description?: string | null;
  status: "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED" | string;
  adminNote?: string | null;
  resolvedById?: number | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  resolvedByEmail?: string | null;
  resolvedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface AdminTopicDto {
  id: number;
  chapterTitle?: string;
  title?: string;
  name?: string;
  orderIndex?: number;
  weekNumber?: number;
  estimatedHours?: number;
  contentExcerpt?: string | null;
}

export interface AdminCourseDto {
  id: number;
  name: string;
  collegeId?: number | null;
  collegeName?: string | null;
  universityId?: number | null;
  universityName?: string | null;
  status: "READY" | "NO_SYLLABUS" | "ANALYZING" | "FAILED" | string;
  verified: boolean;
  locked: boolean;
  deletedAt?: string | null;
  enrollmentCount: number;
  topicCount: number;
  openReportCount: number;
  createdAt?: string | null;
  topics?: AdminTopicDto[];
}

export interface AdminUniversityDto {
  id: number;
  name: string;
  city?: string | null;
  collegeCount: number;
  courseCount: number;
}

export interface AdminCollegeDto {
  id: number;
  name: string;
  universityId?: number | null;
  universityName?: string | null;
  courseCount: number;
}

export interface AdminUserDto {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  universityId?: number | null;
  universityName?: string | null;
  authProvider: string;
  enrolledCoursesCount: number;
  geniePoints: number;
  streakCount: number;
  longestStreakDays: number;
  lastStudyDate?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string | null;
}

export interface AdminAuditLogDto {
  id: number;
  adminId: number;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  beforeSummary?: string | null;
  afterSummary?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
}
