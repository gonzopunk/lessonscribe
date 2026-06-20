# Prevent duplicate elements when re-running the Weekly Agenda preset

## Root cause

In `src/lib/planbook/presets.ts`, `seedWeeklyAgendaPreset` already dedupes tags via `findOrCreateTag`, but the five `addTemplate(...)` calls below run unconditionally. When a user deletes the preset worksheet and uses the "Set up for {course}" button again, the tags are reused (good), but five new element templates are appended next to the previous ones (the duplicates the user sees).

The worksheet template itself is already protected: `WorksheetTemplateSettings.tsx` only shows the "Set up" button for courses in `unseededCourses`, computed by checking for an existing `presetId === "weekly-agenda-word-of-day"` worksheet template on that course. So no change is needed for the worksheet template — only for the element templates.

## Fix (single file: `src/lib/planbook/presets.ts`)

Add a `findOrCreateTemplate` helper inside `seedWeeklyAgendaPreset`, parallel to `findOrCreateTag`. It reads the current `templates` array from the store and looks for an existing template with the same `courseId` and same `title` (case-insensitive, trimmed comparison to be safe). If found, do nothing. If not, call `addTemplate(...)`.

Replace each of the five direct `addTemplate({...})` calls with `findOrCreateTemplate({...})`. No other behavior changes:

- Tags: unchanged (already deduped).
- Week-meta labels: unchanged — `updateCourse` is already idempotent.
- Worksheet template: unchanged — already gated by `unseededCourses` in the UI.

## Why title-based dedup is the right key

Templates have no stable preset-element identifier; the only natural key per course is the title. The preset's five titles are distinct from each other ("Word of the Day", "Exit Ticket", "7-min Quick Write", "Turn in Agenda and Word of the Day", "Weekly Reflection"), so collisions across the preset's own elements aren't possible. If a user manually renamed one of those templates, it won't match and the preset will recreate that one — acceptable, because the renamed one is no longer recognizable as the preset's element. If they kept the title intact, it's correctly skipped.

## Out of scope

No store/schema change. No migration. No changes to PresetOfferDialog, WorksheetTemplateSettings, or any other component.
