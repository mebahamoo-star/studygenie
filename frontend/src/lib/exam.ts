import { getUserCourses, getUserStoragePrefix } from "./courses-util";
import { getStoredAccessToken } from "./api/client";
import { examService } from "./api/services";

export interface Exam {
  id?: string;
  course: string;
  type: string;
  date: string;
  professor: string;
}

export function getExamKey(): string {
  const prefix = getUserStoragePrefix();
  return `sg-${prefix}-exams`;
}

export function loadExams(): Exam[] {
  try {
    const prefix = getUserStoragePrefix();
    const key = `sg-${prefix}-exams`;
    const v = localStorage.getItem(key);
    if (v) {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, idx: number) => ({
          ...item,
          id: item.id || `exam-${idx}-${item.course.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        }));
      }
    }

    // Migration from old single-exam storage if available
    const singleKey = `sg-${prefix}-exam`;
    const singleV = localStorage.getItem(singleKey);
    if (singleV) {
      const parsed = JSON.parse(singleV);
      if (parsed && typeof parsed === "object" && parsed.course) {
        const item: Exam = {
          id: parsed.id || `exam-${Date.now()}`,
          course: parsed.course,
          type: parsed.type || "Exam",
          date: parsed.date || new Date().toISOString().slice(0, 10),
          professor: parsed.professor || "",
        };
        const list = [item];
        localStorage.setItem(key, JSON.stringify(list));
        return list;
      }
    }

    // Only fallback to legacy un-scoped exams if user is a guest
    if (prefix === "guest") {
      const legacyList = localStorage.getItem("sg-exams");
      if (legacyList) {
        const parsed = JSON.parse(legacyList);
        if (Array.isArray(parsed)) return parsed;
      }
      const legacy = localStorage.getItem("sg-exam");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed?.course) {
          return [
            {
              id: `exam-${Date.now()}`,
              course: parsed.course,
              type: parsed.type || "Exam",
              date: parsed.date || "",
              professor: parsed.professor || "",
            },
          ];
        }
      }
    }

    return [];
  } catch {
    return [];
  }
}

export function saveExams(exams: Exam[]): void {
  try {
    const prefix = getUserStoragePrefix();
    const key = `sg-${prefix}-exams`;
    localStorage.setItem(key, JSON.stringify(exams));

    // Also update legacy single exam key for backward compatibility
    const singleKey = `sg-${prefix}-exam`;
    if (exams.length > 0) {
      localStorage.setItem(singleKey, JSON.stringify(exams[0]));
    } else {
      localStorage.removeItem(singleKey);
    }
  } catch {}
}

export function saveExam(e: Exam): Exam {
  const current = loadExams();
  const id = e.id || `exam-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const item: Exam = {
    id,
    course: e.course.trim(),
    type: e.type.trim(),
    date: e.date,
    professor: e.professor.trim(),
  };

  const existingIdx = current.findIndex(
    (x) =>
      x.id === id ||
      (x.course.toLowerCase() === item.course.toLowerCase() &&
        x.type.toLowerCase() === item.type.toLowerCase() &&
        x.date === item.date)
  );

  let updated: Exam[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = item;
  } else {
    updated = [...current, item];
  }

  saveExams(updated);

  // Background sync to backend if user is authenticated
  if (getStoredAccessToken() && (!item.id || item.id.startsWith("exam-"))) {
    examService
      .createExam({
        course: item.course,
        type: item.type,
        date: item.date,
        professor: item.professor,
      })
      .then((remote) => {
        if (remote && remote.id) {
          item.id = String(remote.id);
          const fresh = loadExams().map((ex) =>
            ex.course.toLowerCase() === item.course.toLowerCase() &&
            ex.type.toLowerCase() === item.type.toLowerCase() &&
            ex.date === item.date
              ? { ...ex, id: String(remote.id) }
              : ex
          );
          saveExams(fresh);
        }
      })
      .catch((err) => {
        console.warn("Could not sync exam to backend:", err);
      });
  }

  return item;
}

export function deleteExam(examIdOrCourse: string): void {
  const current = loadExams();
  const target = examIdOrCourse.trim().toLowerCase();
  const match = current.find(
    (x) => x.id === examIdOrCourse || x.course.trim().toLowerCase() === target
  );

  const updated = current.filter(
    (x) => x.id !== examIdOrCourse && x.course.trim().toLowerCase() !== target
  );
  saveExams(updated);

  if (match && match.id && !isNaN(Number(match.id)) && getStoredAccessToken()) {
    examService.deleteExam(Number(match.id)).catch(() => {});
  }
}

export async function fetchAndSyncExams(): Promise<Exam[]> {
  try {
    if (getStoredAccessToken()) {
      const remote = await examService.getExams();
      if (remote) {
        const mapped: Exam[] = remote.map((re) => ({
          id: String(re.id),
          course: re.course,
          type: re.type,
          date: re.date,
          professor: re.professor || "",
        }));
        saveExams(mapped);
        return mapped;
      }
    }
  } catch {}
  return loadExams();
}

export function clearExams(): void {
  try {
    const prefix = getUserStoragePrefix();
    localStorage.removeItem(`sg-${prefix}-exams`);
    localStorage.removeItem(`sg-${prefix}-exam`);
    localStorage.removeItem("sg-exams");
    localStorage.removeItem("sg-exam");
  } catch {}
}

export const clearExam = clearExams;

export function isCourseEnrolled(
  courseNameOrCode: string,
  enrolledCourses?: { name: string; code?: string }[]
): boolean {
  if (!courseNameOrCode) return false;
  const list = enrolledCourses ?? getUserCourses();
  if (!list || list.length === 0) return false;

  const target = courseNameOrCode.trim().toLowerCase();
  return list.some((c) => {
    const name = c.name.trim().toLowerCase();
    const code = (c.code || "").trim().toLowerCase();
    return (
      target === name ||
      (code && target === code) ||
      target.includes(name) ||
      name.includes(target)
    );
  });
}

export function loadExamsForUser(
  _enrolledCourses?: { name: string; code?: string }[]
): Exam[] {
  const all = loadExams();
  if (all.length === 0) return [];

  // Sort by date ascending (closest upcoming exam first)
  return all.sort((a, b) => {
    const timeA = new Date(a.date + "T00:00:00").getTime();
    const timeB = new Date(b.date + "T00:00:00").getTime();
    return timeA - timeB;
  });
}

export function loadExam(): Exam | null {
  const exams = loadExamsForUser();
  return exams.length > 0 ? exams[0] : null;
}

export function loadExamForUser(
  enrolledCourses?: { name: string; code?: string }[]
): Exam | null {
  const exams = loadExamsForUser(enrolledCourses);
  return exams.length > 0 ? exams[0] : null;
}

export function daysUntil(date: string): number {
  if (!date) return 0;
  const d = new Date(date + "T00:00:00").getTime();
  const t = new Date(new Date().toDateString()).getTime();
  return Math.round((d - t) / 86400000);
}
