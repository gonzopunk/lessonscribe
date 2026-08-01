import type { Course, DayMinutes } from "./types";

const DEFAULT_MINUTES = 50;
const KEYS: (keyof DayMinutes)[] = ["mon", "tue", "wed", "thu", "fri"];

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Guarantees a `dayMinutes` object on a course, deriving it from the legacy
 * periodMinutes / wednesdayMinutes fields when needed. Legacy fields are kept.
 */
export function normalizeCourse(c: any): Course {
  if (!c) return c;
  const dm = c.dayMinutes;
  if (dm && KEYS.every((k) => isNum(dm[k]))) return c as Course;

  const regular = isNum(c.periodMinutes) ? c.periodMinutes : DEFAULT_MINUTES;
  const wed = isNum(c.wednesdayMinutes) ? c.wednesdayMinutes : DEFAULT_MINUTES;
  return {
    ...c,
    dayMinutes: { mon: regular, tue: regular, wed, thu: regular, fri: regular },
  } as Course;
}

export function minutesForDay(course: Course, date: Date): number {
  const dm = course?.dayMinutes;
  if (!dm) return course?.periodMinutes ?? DEFAULT_MINUTES;
  const day = date.getDay();
  const key = KEYS[day - 1];
  if (!key) return dm.mon;
  return dm[key];
}

export function isShortDay(course: Course, date: Date): boolean {
  const dm = course?.dayMinutes;
  if (!dm) return false;
  const max = Math.max(...KEYS.map((k) => dm[k]));
  return minutesForDay(course, date) < max;
}
