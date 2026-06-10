import { usePlanBook } from "./store";
import type { FieldMapping } from "./types";

export function seedWeeklyAgendaPreset(courseId: string): void {
  const { addTag, addTemplate, updateCourse, addWorksheetTemplate } =
    usePlanBook.getState();

  // Step A — tags
  const wordTagId = addTag({ courseId, name: "Word of the Day", color: "violet" });
  const activityTagId = addTag({ courseId, name: "Main Activity", color: "blue" });
  const exitTagId = addTag({ courseId, name: "Exit Ticket", color: "green" });

  // Step B — element templates
  addTemplate({
    courseId,
    title: "Word of the Day",
    tagIds: [wordTagId],
    defaultMinutes: 5,
    color: "violet",
    notes: "Add today's word in the content field below",
    links: [],
  });
  addTemplate({
    courseId,
    title: "Exit Ticket",
    tagIds: [exitTagId],
    defaultMinutes: 5,
    color: "green",
    notes: "Add today's exit ticket question in the content field below",
    links: [],
  });
  addTemplate({
    courseId,
    title: "7-min Quick Write",
    tagIds: [activityTagId],
    defaultMinutes: 7,
    color: "blue",
    notes: "",
    links: [],
  });
  addTemplate({
    courseId,
    title: "Turn in Agenda and Word of the Day",
    tagIds: [activityTagId],
    defaultMinutes: 2,
    color: "blue",
    notes: "",
    links: [],
  });
  addTemplate({
    courseId,
    title: "Weekly Reflection",
    tagIds: [activityTagId],
    defaultMinutes: 10,
    color: "blue",
    notes: "Place on Fridays only",
    links: [],
  });

  // Step C — week meta labels
  updateCourse(courseId, {
    weekMetaLabel1: "Week Header",
    weekMetaLabel2: "Tip of the Week",
    weekMetaLabel3: "Reflection Prompt 1",
    weekMetaLabel4: "Reflection Prompt 2",
    weekMetaLabel5: "Reflection Prompt 3",
  });

  // Step D — worksheet template
  const dayOffsets = [
    { off: 0 as const, sfx: "mon" },
    { off: 1 as const, sfx: "tue" },
    { off: 2 as const, sfx: "wed" },
    { off: 3 as const, sfx: "thu" },
    { off: 4 as const, sfx: "fri" },
  ];

  const dayFields: FieldMapping[] = dayOffsets.flatMap(({ off, sfx }) => [
    { fieldName: `date_${sfx}`, source: { type: "day-date", dayOffset: off, format: "EEE, MMM d" } },
    { fieldName: `word_${sfx}`, source: { type: "element-content", dayOffset: off, tagId: wordTagId } },
    { fieldName: `activities_${sfx}`, source: { type: "element-titles", dayOffset: off, tagId: activityTagId, separator: "\n", asArray: true } },
    { fieldName: `exit_${sfx}`, source: { type: "element-content", dayOffset: off, tagId: exitTagId } },
  ]);

  const fieldMappings: FieldMapping[] = [
    { fieldName: "week_header", source: { type: "week-custom", fieldKey: "custom1" } },
    { fieldName: "weekly_objective", source: { type: "week-objectives" } },
    { fieldName: "tip_week", source: { type: "week-custom", fieldKey: "custom2" } },
    { fieldName: "reflection_1", source: { type: "week-custom", fieldKey: "custom3" } },
    { fieldName: "reflection_2", source: { type: "week-custom", fieldKey: "custom4" } },
    { fieldName: "reflection_3", source: { type: "week-custom", fieldKey: "custom5" } },
    ...dayFields,
  ];

  addWorksheetTemplate({
    courseId,
    name: "Weekly Agenda with Word of the Day",
    type: "preset",
    presetId: "weekly-agenda-word-of-day",
    hasFile: false,
    bundledTemplateUrl: "/presets/weekly-agenda-ela.docx",
    detectedFields: [],
    loopFields: ["activities_mon", "activities_tue", "activities_wed", "activities_thu", "activities_fri"],
    fieldMappings,
  });
}
