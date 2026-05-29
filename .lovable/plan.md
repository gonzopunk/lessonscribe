# Plan: Manage day elements + archive templates + one-off elements

Three related capabilities for the planner. All localStorage-only, no backend changes.

## 1. Delete an element from a day

Today an instance can only be removed from inside the popover (the small X next to the title). It's discoverable only after a click. Make it one click from the day cell.

- **InstanceCard**: add a hover-only `×` button in the top-right corner (mirrors the existing drag handle pattern — `opacity-0 group-hover:opacity-100`). Calls `removeInstance(id)` directly. Keep the popover X as well.
- Add a confirm step only if the instance has content/notes — otherwise delete immediately (avoids friction for misplaced drops).

## 2. Archive / recover elements (templates)

The Element Bank should let teachers retire templates without losing history, then bring them back later.

- **Types** (`src/lib/planbook/types.ts`): add `archived?: boolean` to `ElementTemplate`. Existing instances are unaffected (they snapshot fields at creation).
- **Store** (`src/lib/planbook/store.ts`): add `archiveTemplate(id)` and `restoreTemplate(id)` actions (thin wrappers over `updateTemplate`). `removeTemplate` stays as the hard-delete option.
- **ElementBank**:
  - Default view filters out archived templates.
  - Add a small "Show archived" toggle in the bank header (chip/switch). When on, archived templates are shown in a separate "Archived" section at the bottom with muted styling.
  - **BankCard**: add a kebab menu with `Edit`, `Archive` / `Restore` (depending on state), and `Delete permanently…` (existing destructive action).
- **ElementEditorDialog**: add an "Archive" / "Restore" button in the footer alongside Delete.
- Archived templates are not draggable and don't appear in tag groupings in the default view.

## 3. Add a one-off element directly to a day

A lesson element that won't recur and shouldn't clutter the bank.

- **Store**: add `addAdHocInstance(courseId, dayKey, data)` where `data = { title, defaultMinutes, color, tagIds, content?, instanceNotes? }`. Internally creates an `ElementInstance` with `templateId: ""` (sentinel for ad-hoc) and `order = existingCount`. No template is created.
- **New component** `src/components/planbook/QuickAddDialog.tsx`: a small dialog (title, minutes, color, optional tags, optional today's content). Reuses the color picker and tag chips from `ElementEditorDialog`.
- **DayCell**: add a `Quick add element…` item to the existing kebab dropdown (above "Duplicate to…"), and a subtle `+` affordance in the empty-state "Drop element" placeholder that opens the same dialog.
- **InstanceCard**: works unchanged for ad-hoc instances — fields are already snapshotted on the instance.
- **PlanModal / FilterBar**: no changes needed; they read from `instances` directly and filter by `tagIds` on the instance.

## Technical notes

- `templateId: ""` is the ad-hoc sentinel. Anywhere we look up a template from an instance (currently only the drag overlay, which uses the active template by id) we already tolerate "not found" — verify and add a guard if missing.
- Zustand selectors stay stable: derive archived/active lists via `useMemo` on `allTemplates`, same pattern as the recent FilterBar/ElementBank fix.
- No migration needed: `archived` is optional (`undefined` === active); existing persisted state in localStorage loads fine.

## Files touched

- `src/lib/planbook/types.ts` — add `archived?` to `ElementTemplate`
- `src/lib/planbook/store.ts` — `archiveTemplate`, `restoreTemplate`, `addAdHocInstance`
- `src/components/planbook/InstanceCard.tsx` — hover delete button
- `src/components/planbook/BankCard.tsx` — kebab menu (edit/archive/delete)
- `src/components/planbook/ElementBank.tsx` — archived filter toggle + section
- `src/components/planbook/ElementEditorDialog.tsx` — archive/restore button
- `src/components/planbook/DayCell.tsx` — "Quick add element…" menu item + empty-state `+`
- `src/components/planbook/QuickAddDialog.tsx` — new dialog
- `src/components/planbook/PlannerWorkspace.tsx` — wire QuickAddDialog state
