export type Upload = { name: string; size: number; date: string; by: string };
const KEY = "sg-uploads";

const seed: Record<string, Upload[]> = {};

export function loadUploads(course: string): Upload[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "null") ?? seed;
    return all[course] ?? [];
  } catch {
    return [];
  }
}

export function addUploads(course: string, files: Upload[]) {
  let all: Record<string, Upload[]>;
  try {
    all = JSON.parse(localStorage.getItem(KEY) || "null") ?? { ...seed };
  } catch {
    all = { ...seed };
  }
  all[course] = [...files, ...(all[course] ?? [])];
  localStorage.setItem(KEY, JSON.stringify(all));
  return all[course];
}

export const fmtSize = (b: number) =>
  b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`;
