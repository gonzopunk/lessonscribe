import { addDays, format } from "date-fns";
import { dayKey, metaKey, weekMetaKey } from "./dates";
import { blankWeekMeta, type FieldSource, type PlanBookState } from "./types";

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
      case "day-differentiation": {
        const dKey = dayKey(addDays(weekMonday, source.dayOffset));
        return state.dayMeta[metaKey(courseId, dKey)]?.differentiationNotes ?? "";
      }
      case "day-behavior": {
        const dKey = dayKey(addDays(weekMonday, source.dayOffset));
        return state.dayMeta[metaKey(courseId, dKey)]?.behaviorNotes ?? "";
      }
      case "day-materials": {
        const dKey = dayKey(addDays(weekMonday, source.dayOffset));
        return state.dayMeta[metaKey(courseId, dKey)]?.materialsNotes ?? "";
      }
      case "week-of-date":
        return format(weekMonday, source.format || "MMMM d, yyyy");
      case "day-date":
        return format(
          addDays(weekMonday, source.dayOffset),
          source.format || "MMMM d",
        );
      case "static":
        return source.text ?? "";
      case "week-objectives": {
        const wm = state.weekMeta[weekMetaKey(courseId, dayKey(weekMonday))] ?? blankWeekMeta();
        return wm.weeklyObjectives;
      }
      case "week-essential-question": {
        const wm = state.weekMeta[weekMetaKey(courseId, dayKey(weekMonday))] ?? blankWeekMeta();
        return wm.essentialQuestion;
      }
      case "week-notes": {
        const wm = state.weekMeta[weekMetaKey(courseId, dayKey(weekMonday))] ?? blankWeekMeta();
        return wm.weeklyNotes;
      }
      case "week-custom": {
        const wm = state.weekMeta[weekMetaKey(courseId, dayKey(weekMonday))]
          ?? blankWeekMeta();
        switch (source.fieldKey) {
          case "custom1": return wm.custom1;
          case "custom2": return wm.custom2;
          case "custom3": return wm.custom3;
          case "custom4": return wm.custom4;
          case "custom5": return wm.custom5;
          default: return "";
        }
      }
      default:
        return "";
    }
  } catch {
    return "";
  }
}

export function resolveFieldValueForDocx(
  source: FieldSource,
  courseId: string,
  weekMonday: Date,
  state: PlanBookState,
): string | string[] {
  try {
    if (source.type === "element-titles" && source.asArray) {
      const dKey = dayKey(addDays(weekMonday, source.dayOffset));
      return state.instances
        .filter((i) => {
          if (i.courseId !== courseId || i.dayKey !== dKey) return false;
          if (source.tagId && !i.tagIds.includes(source.tagId)) return false;
          return true;
        })
        .sort((a, b) => a.order - b.order)
        .map((i) => i.title);
    }
    return resolveFieldValue(source, courseId, weekMonday, state);
  } catch {
    return "";
  }
}
