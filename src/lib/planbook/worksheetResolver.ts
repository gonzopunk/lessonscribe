import { addDays, format } from "date-fns";
import { dayKey, metaKey } from "./dates";
import type { FieldSource, PlanBookState } from "./types";

export function resolveFieldValue(
  source: FieldSource,
  courseId: string,
  weekMonday: Date,
  state: PlanBookState,
): string {
  try {
    switch (source.type) {
      case "element-content": {
        const dKey = dayKey(addDays(weekMonday, source.dayOffset));
        const match = state.instances.find(
          (i) =>
            i.courseId === courseId &&
            i.dayKey === dKey &&
            i.tagIds.includes(source.tagId),
        );
        return match?.content ?? "";
      }
      case "element-titles": {
        const dKey = dayKey(addDays(weekMonday, source.dayOffset));
        const matches = state.instances
          .filter((i) => {
            if (i.courseId !== courseId || i.dayKey !== dKey) return false;
            if (source.tagId && !i.tagIds.includes(source.tagId)) return false;
            return true;
          })
          .sort((a, b) => a.order - b.order)
          .map((i) => i.title);
        if (matches.length === 0) return "";
        const sep = (source.separator ?? "\n").replace(/\\n/g, "\n");
        return matches.join(sep);
      }
      case "day-notes": {
        const dKey = dayKey(addDays(weekMonday, source.dayOffset));
        return state.dayMeta[metaKey(courseId, dKey)]?.notes ?? "";
      }
      case "day-objectives": {
        const dKey = dayKey(addDays(weekMonday, source.dayOffset));
        return state.dayMeta[metaKey(courseId, dKey)]?.objectives ?? "";
      }
      case "week-of-date":
        return format(weekMonday, source.format || "MMMM d, yyyy");
      case "static":
        return source.text ?? "";
      default:
        return "";
    }
  } catch {
    return "";
  }
}
