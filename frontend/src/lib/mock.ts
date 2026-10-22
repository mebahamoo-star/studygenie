export const universities: string[] = [];
export const colleges: string[] = [];

export type CourseStatus = "ready" | "none" | "processing";

export interface CourseItem {
  id: string;
  code: string;
  name: string;
  status: CourseStatus;
}

export const courses: CourseItem[] = [];

export interface ChapterItem {
  title: string;
  hours: number;
}

export const chapters: ChapterItem[] = [];

export interface TodayTaskItem {
  id: number;
  label: string;
  course: string;
  min: number;
  tag: string;
}

export const todayTasks: TodayTaskItem[] = [];

export interface PlanItem {
  date: string;
  tasks: { t: string; tag: string; min: number }[];
}

export const plan: PlanItem[] = [];

export interface FlashcardItem {
  q: string;
  a: string;
}

export const flashcards: FlashcardItem[] = [];

export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export const quiz: QuizItem[] = [];

export interface LeaderboardItem {
  name: string;
  uni: string;
  pts: number;
  me?: boolean;
}

export const leaderboard: LeaderboardItem[] = [];

export const loaderMessages = [
  "Reading your syllabus...",
  "Building your study plan...",
  "Short breaks every 25 minutes boost memory retention",
  "Sprinkling a little genie magic...",
  "Testing yourself beats re-reading — active recall wins",
];
