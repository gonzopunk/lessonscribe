## Plan: Tag deduplication guard and settings validation

### File 1 — `src/lib/planbook/presets.ts`
Inside `seedWeeklyAgendaPreset`:
1. Destructure `tags` from store state and add a `findOrCreateTag` helper that reuses existing tags by name+course instead of creating duplicates.
2. Replace Step A tag creation: use `findOrCreateTag` for "Word of the Day" (violet), "Student Agenda" (amber), and "Exit Ticket" (green). Remove "Main Activity".
3. Update the three routine element templates (7-min Quick Write, Turn in Agenda and Word of the Day, Weekly Reflection) to use the new `agendaTagId` and color `amber`.
4. Update the `activities_${sfx}` field mapping to use `agendaTagId`, and rename the worksheet template to "Weekly Agenda and Accountability Tracker". Keep `presetId` unchanged.

### File 2 — `src/routes/settings.tsx`
In the Category tags section, add an `onBlur` validator to each tag name `Input`. If the trimmed name is non-empty and matches another tag in the same course (case-insensitive), show a `toast.error` telling the user to rename or delete the duplicate.

No other files will be touched.