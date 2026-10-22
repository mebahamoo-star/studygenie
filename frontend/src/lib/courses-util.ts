import type { Course, CourseStatus } from "./api/types";

export function getUserStoragePrefix(): string {
  try {
    const userRaw = localStorage.getItem("sg-user");
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (u?.id) return `u${u.id}`;
      if (u?.email) return `u_${u.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }
  } catch {}
  return "guest";
}

/**
 * Ensures that different courses never share identical chapter/topic lists.
 * If a course mistakenly received a copy of another course's topics (e.g. Operating Systems),
 * its topics are reset so the user can upload its own material.
 */
export function sanitizeUserCourses(courses: Course[]): Course[] {
  if (!courses || courses.length <= 1) return courses || [];

  const seenSignatures = new Map<string, string>(); // signature -> first course name

  return courses.map((c) => {
    if (!c.topics || c.topics.length === 0) return c;

    // Build a signature of chapter names
    const sig = c.topics
      .map((t) => t.name.trim().toLowerCase())
      .filter(Boolean)
      .join("|||");

    if (!sig) return c;

    if (seenSignatures.has(sig)) {
      const originalCourse = seenSignatures.get(sig);
      console.warn(`Sanitizing course "${c.name}": topics were duplicated from "${originalCourse}"`);
      return {
        ...c,
        status: "none" as CourseStatus,
        topics: [],
      };
    }

    seenSignatures.set(sig, c.name);
    return c;
  });
}

export function getUserCourses(): Course[] {
  try {
    const prefix = getUserStoragePrefix();
    const raw = localStorage.getItem(`sg-${prefix}-courses`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return sanitizeUserCourses(parsed);
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveUserCourses(courses: Course[]): void {
  try {
    const prefix = getUserStoragePrefix();
    const sanitized = sanitizeUserCourses(courses);
    localStorage.setItem(`sg-${prefix}-courses`, JSON.stringify(sanitized));
  } catch {}
}

export function getUserTaskKits(): Record<string, any> {
  try {
    const prefix = getUserStoragePrefix();
    const raw = localStorage.getItem(`sg-${prefix}-task-kits`);
    if (raw) return JSON.parse(raw);
    return {};
  } catch {
    return {};
  }
}

export function saveUserTaskKits(kits: Record<string, any>): void {
  try {
    const prefix = getUserStoragePrefix();
    localStorage.setItem(`sg-${prefix}-task-kits`, JSON.stringify(kits));
  } catch {}
}

export function hasUserEnrolledCourses(): boolean {
  return getUserCourses().length > 0;
}
