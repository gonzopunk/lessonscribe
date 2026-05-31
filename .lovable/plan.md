# WeekMeta (Weekly Notes) Feature

Self-contained addition for per-course, per-week notes (objectives, essential question, general notes, two custom-labeled fields). Surfaces via a hover-revealed "Weekly notes" button in each week column header, persists to existing localStorage store, and integrates with the worksheet generator so weekly fields can be mapped to PDF form fields.

## 1. Types — `src/lib/planbook/types.ts`

- Add `WeekMeta` interface (5 string fields: `weeklyObjectives`, `essentialQuestion`, `weeklyNotes`, `custom1`, `custom2`).
- Add optional `weekMetaLabel1?: string` and `weekMetaLabel2?: string` on `Course` (after `subDefaults`).
- Add `weekMeta: Record<string, WeekMeta>` on `PlanBookState` (key: `week:${courseId}:${weekKey}`).
- Extend `FieldSource` union with four new variants:
  - `{ type: "week-objectives" }`
  - `{ type: "week-essential-question" }`
  - `{ type: "week-notes" }`
  - `{ type: "week-custom"; fieldKey: "custom1" | "custom2" }`
- Export a `blankWeekMeta()` factory from this file (placed here to avoid a circular import between `store.ts` and `worksheetResolver.ts`).

## 2. Dates — `src/lib/planbook/dates.ts`

- Add `export const weekMetaKey = (courseId, weekKey) => \`week:${courseId}:${weekKey}\`` after `metaKey`.

## 3. Store — `src/lib/planbook/store.ts`

- Import `weekMetaKey` from `./dates` and `WeekMeta` + `blankWeekMeta` from `./types`.
- Add `weekMeta: {}` to `initialState`.
- Add `weekMeta: p.weekMeta ?? {}` to `merge`.
- Add `updateWeekMeta(courseId, weekKey, patch)` to `Actions` and implement using the exact pattern in the spec.
- Extend `removeCourse` cascade with `weekMeta: Object.fromEntries(Object.entries(s.weekMeta).filter(([k]) => !k.startsWith(\`week:${id}:\`)))`.

## 4. Worksheet Resolver — `src/lib/planbook/worksheetResolver.ts`

- Import `weekMetaKey` from `./dates` and `blankWeekMeta` from `./types`.
- Inside `resolveFieldValue`, add four new cases. Each computes `const wm = state.weekMeta[weekMetaKey(courseId, dayKey(weekMonday))] ?? blankWeekMeta()` then returns the matching field. `week-custom` switches on `source.fieldKey`.

## 5. New Component — `src/components/planbook/WeekNotesDialog.tsx`

- Props: `{ open, onOpenChange, courseId, weekKey }`.
- Reads `weekMeta[weekMetaKey(courseId, weekKey)] ?? blankWeekMeta()` and active course from store.
- `label1 = course?.weekMetaLabel1 || "Custom note 1"`, same for label2.
- shadcn `Dialog` with title `Week of {format(parseDayKey(weekKey), "MMM d, yyyy")}`.
- Five `Textarea rows={3}` in order: Weekly objectives, Essential question, Weekly notes, label1, label2. Each calls `updateWeekMeta(courseId, weekKey, { [field]: value })` on every `onChange` (auto-save, no Save button).
- "Clear week notes" button at bottom, behind `window.confirm`, resets all five fields to `""`.

## 6. PlannerWorkspace — `src/components/planbook/PlannerWorkspace.tsx`

- Add `weekNotesDialog` state and `weekMetaMap = usePlanBook(s => s.weekMeta)`.
- Import `weekMetaKey` from `@/lib/planbook/dates`, `Notebook` from `lucide-react`, and `WeekNotesDialog`.
- In the existing `group` week-header div, add a `Notebook` icon button to the LEFT of the worksheet button:
  - `size-6`, `aria-label="Week notes"`, `title="Weekly notes"`, `relative` container.
  - When `hasNotes` (any non-empty value in this week's WeekMeta): full opacity + small `bg-primary` dot at `-top-0.5 -right-0.5`.
  - Otherwise: `opacity-0 group-hover:opacity-100 transition-opacity`.
  - `onClick` opens dialog with `dayKey(wkMonday)`.
- Render `<WeekNotesDialog>` alongside other dialogs, guarded by `weekNotesDialog.weekKey`.

## 7. Settings — `src/routes/settings.tsx`

- In each course card, after the sub-plan-defaults `Textarea`, add two labeled `Input` fields bound to `weekMetaLabel1` / `weekMetaLabel2` via `updateCourse`. Placeholders default to `"Custom note 1"` / `"Custom note 2"`.
- Add a small muted helper note explaining the labels appear in the Weekly notes dialog.

## 8. WorksheetTemplateSettings dropdown — `src/components/planbook/WorksheetTemplateSettings.tsx`

The source-type dropdown is built from a hard-coded label map (not the union), so the four new variants need to be added manually:

- Extend the `defaultSourceFor` switch with four new cases returning the appropriate object shapes.
- Add four entries to the source-type label map: `"week-objectives": "Weekly objectives"`, `"week-essential-question": "Essential question"`, `"week-notes": "Weekly notes"`, `"week-custom": "Custom weekly note"`.
- For `week-custom`, render a small inline `Select` (custom1 / custom2) to set `source.fieldKey`. The other three need no extra controls (no day offset, no tag).
- The existing `requiresDay` guard already excludes these (it only lists element/day variants), so day pickers stay hidden.

## Technical Notes

- `blankWeekMeta` lives in `types.ts` (exported) — avoids any circular import between store and resolver.
- `weekMetaKey` is the single source of truth for the key format; imported wherever needed.
- No existing behavior is modified. `DayMeta`, `ElementInstance`, `worksheetTemplates`, routes, and other components are untouched beyond the additions above.
- `resolveFieldValue` continues to never throw; the new branches use `?? blankWeekMeta()` and return `""` on missing data.
