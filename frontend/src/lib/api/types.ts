export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
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
  subtopics?: string[];
  contentExcerpt?: string;
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
