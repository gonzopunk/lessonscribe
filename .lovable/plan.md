
## Scope

Three targeted code changes. No visual or behavioral changes outside the stated fixes.

## 1. `src/lib/planbook/history.ts` — fix `pick()`

- Drop the `{ ...s.settings }` spread; assign `settings: s.settings` directly so the reference is stable across snapshots.
- Add the two missing persisted slices: `worksheetTemplates: s.worksheetTemplates` and `weekMeta: s.weekMeta`. Without these, weekly notes and worksheet template changes were silently excluded from undo/redo.

Final `pick()` returns: `version, onboarded, settings, courses, activeCourseId, tags, templates, instances, overrides, dayMeta, worksheetTemplates, weekMeta`.

## 2. `src/lib/planbook/history.ts` — replace `JSON.stringify` diff

Zustand updates are immutable, so reference equality on each slice is correct and O(1). Add above `initHistory()`:

```ts
function hasChanges(a: Snapshot, b: Snapshot): boolean {
  return (
    a.instances !== b.instances ||
    a.dayMeta !== b.dayMeta ||
    a.weekMeta !== b.weekMeta ||
    a.courses !== b.courses ||
    a.tags !== b.tags ||
    a.templates !== b.templates ||
    a.overrides !== b.overrides ||
    a.worksheetTemplates !== b.worksheetTemplates ||
    a.settings !== b.settings
  );
}
```

Replace:

```ts
if (last && JSON.stringify(last) === JSON.stringify(snap)) return;
```

with:

```ts
if (last && !hasChanges(last, snap)) return;
```

This removes a full-state JSON serialization that runs on every debounced store change — a significant CPU win on large plans.

## 3. New `src/components/planbook/ErrorBoundary.tsx`

React class component (boundaries must be classes). Props: `children`, optional `label?: string` (default `"this section"`).

- `getDerivedStateFromError` → store error in state.
- `componentDidCatch` → `console.error` the error + component info.
- Fallback render: `rounded border border-border bg-card p-4` block with
  - text: `Something went wrong in {label}.`
  - error `message` in `text-sm text-muted-foreground`
  - a "Reload page" button (existing `Button` component) calling `window.location.reload()`.
- No error → render `children` unchanged.

## 4. Wire boundaries into `src/components/planbook/PlannerWorkspace.tsx`

Import `ErrorBoundary`. Wrap each call site:

| Target | Label |
|---|---|
| Entire `DndContext` block (week grid) | `the planner grid` |
| `MonthView` | `the month view` |
| `ElementBank` | `the element bank` |
| `WorksheetGenerateDialog` | `the worksheet generator` |
| `PlanModal` | `the lesson plan` |
| `WeekNotesDialog` | `the weekly notes` |
| `CalendarOverrideDialog` | `the calendar override` |
| `QuickAddDialog` | `the quick add` |
| `DuplicateDayDialog` | `the duplicate day dialog` |

No other files touched. No styling/layout changes.

## Expected effect

- Undo/redo now covers weekly notes and worksheet template mappings.
- Per-keystroke history work drops from O(state size) JSON to O(1) reference checks — should reduce typing lag on large plans, including inside the preview frame.
- Render-time crashes in a single panel/dialog no longer take down the whole workspace.
