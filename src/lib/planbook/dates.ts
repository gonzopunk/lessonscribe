import { addDays, format, parseISO, startOfWeek } from "date-fns";

export const dayKey = (d: Date): string => format(d, "yyyy-MM-dd");
export const parseDayKey = (k: string): Date => parseISO(k);

export const mondayOf = (d: Date): Date => startOfWeek(d, { weekStartsOn: 1 });

export function weekdaysOfWeek(monday: Date): Date[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

export function weeksFrom(monday: Date, count: number): Date[][] {
  return Array.from({ length: count }, (_, i) =>
    weekdaysOfWeek(addDays(monday, i * 7)),
  );
}

export function shiftWeeks(monday: Date, weeks: number): Date {
  return addDays(monday, weeks * 7);
}

export function formatDayShort(d: Date): string {
  return format(d, "EEE, MMM d");
}
export function formatDayLong(d: Date): string {
  return format(d, "EEEE, MMMM d, yyyy");
}
export function formatWeekRange(monday: Date): string {
  return `${format(monday, "MMM d")} – ${format(addDays(monday, 4), "MMM d")}`;
}
export function isWednesday(d: Date): boolean {
  return d.getDay() === 3;
}

export const metaKey = (courseId: string, dKey: string) => `${courseId}:${dKey}`;
