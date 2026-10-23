import type { Course, CourseStatus, Topic } from "./api/types";

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
 * Deduplicates chapter topics within a course syllabus.
 * Collapses duplicate chapter titles and removes synthetic "(Part X)" duplicates.
 */
export function deduplicateTopics(topics: Topic[]): Topic[] {
  if (!topics || !Array.isArray(topics)) return [];
  const seen = new Set<string>();
  const clean: Topic[] = [];

  for (const t of topics) {
    if (!t || !t.name) continue;
    const cleanName = t.name.replace(/\s*\(Part\s*\d+\)$/i, "").trim();
    const normKey = cleanName
      .replace(/^chapter\s*\d+[:\s.-]*/i, "")
      .trim()
      .toLowerCase();

    if (!normKey || seen.has(normKey)) continue;
    seen.add(normKey);

    clean.push({
      ...t,
      id: clean.length + 1,
      name: cleanName,
    });
  }

  return clean;
}

/**
 * Ensures that:
 * 1. The same syllabus / chapters are NEVER duplicated within a course.
 * 2. Courses with identical names are collapsed into a single canonical course.
 * 3. Different courses never mistakenly share identical chapter signatures.
 */
export function sanitizeUserCourses(courses: Course[]): Course[] {
  if (!courses || !Array.isArray(courses)) return [];

  // 1. Deduplicate courses by name (collapsing identical course entries)
  const seenCourseNames = new Map<string, Course>();
  for (const c of courses) {
    if (!c || !c.name) continue;
    const nameKey = c.name.trim().toLowerCase();
    const rawCode = c.code ? String(c.code).trim() : "";
    const cleanCode = rawCode.toUpperCase() === "CUSTOM" ? "" : rawCode;
    const cleanTopics = deduplicateTopics(c.topics || []);

    const candidate: Course = {
      ...c,
      code: cleanCode,
      topics: cleanTopics,
    };

    if (!seenCourseNames.has(nameKey)) {
      seenCourseNames.set(nameKey, candidate);
    } else {
      const existing = seenCourseNames.get(nameKey)!;
      const existingCount = existing.topics?.length || 0;
      const candidateCount = candidate.topics?.length || 0;
      if (candidateCount > existingCount || (candidate.status === "ready" && existing.status !== "ready")) {
        seenCourseNames.set(nameKey, candidate);
      }
    }
  }

  const uniqueCourses = Array.from(seenCourseNames.values());
  const seenSignatures = new Map<string, string>(); // signature -> first course name

  // 2. Ensure distinct chapter signatures across different courses
  return uniqueCourses.map((item) => {
    if (!item.topics || item.topics.length === 0) return item;

    // Build a signature of chapter names
    const sig = item.topics
      .map((t) => t.name.trim().toLowerCase())
      .filter(Boolean)
      .join("|||");

    if (!sig) return item;

    if (seenSignatures.has(sig)) {
      const originalCourse = seenSignatures.get(sig);
      console.warn(`Sanitizing course "${item.name}": topics were duplicated from "${originalCourse}"`);
      return {
        ...item,
        status: "none" as CourseStatus,
        topics: [],
      };
    }

    seenSignatures.set(sig, item.name);
    return item;
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
    const oldRaw = localStorage.getItem("sg-user-courses");
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw);
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
export function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
