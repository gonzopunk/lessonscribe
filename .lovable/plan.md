# Per-section day notes

The data model already supports this: `DayMeta.sectionNotes: Record<string, string>` exists on every day record, keyed by `sectionId`, and `updateDayMeta` persists patches to it. Nothing in the UI currently reads or writes it. This plan wires it in.

## Changes

**`src/components/planbook/PlanModal.tsx`**
- Under the existing "Day notes" textarea, add a "Section notes" block that renders one labeled textarea per `course.sections` entry.
- Each textarea is bound to `meta.sectionNotes[section.id] ?? ""` and on change calls:
  ```ts
  updateDayMeta(course.id, dayKey, {
    sectionNotes: { ...meta.sectionNotes, [section.id]: value },
  });
  ```
- If the course has 0 or 1 section, hide the section-notes block entirely (the existing "Day notes" field is sufficient).
- Compact rows: 2-row textareas, matching the existing Day notes styling.

**Print/PDF output (same file, `print()` builder around lines 65–95)**
- After the Day Notes section, append a "Section Notes" block listing each section name with its note. Skip the block entirely when the course has ≤1 section or when every section note is empty.
- Reuse the existing `escape()` helper.

## Out of scope

- No type changes — `sectionNotes` already exists on `DayMeta`.
- No store changes — `updateDayMeta` already merges patches.
- No changes to `InstanceCard`, `DayCell`, or per-instance content (instance-level content/notes remain global to the day; only the day-level free-text notes get a per-section variant, which matches the user's request).
