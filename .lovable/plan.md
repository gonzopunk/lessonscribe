Fix five confirmed bugs. Scope is exactly the changes described — no extra layout or behavior tweaks.

## BUG 1 — WeekNotesDialog scroll
**File:** `src/components/planbook/WeekNotesDialog.tsx`
- `DialogContent` className: `max-w-2xl` → `max-w-2xl max-h-[90vh] flex flex-col`
- Wrap the existing `<div className="space-y-4">…</div>` fields block in `<div className="flex-1 overflow-y-auto">…</div>` so header and footer stay fixed.

## BUG 2 — MonthView navigation
**File:** `src/components/planbook/MonthView.tsx`
- In both prev/next button handlers, set anchor via `toKey(startOfMonth(next))` (drop the `mondayOf(...)` wrapper at the navigation call sites only).
- Before `return`, add: `const displayMonth = startOfMonth(monthAnchor);`
- Header: `format(monthAnchor, "MMMM yyyy")` → `format(displayMonth, "MMMM yyyy")`
- `const monthIndex = monthAnchor.getMonth()` → `const monthIndex = displayMonth.getMonth()`
- Leave the `weeks` useMemo alone.

## BUG 3 — Popover X removes element
**File:** `src/components/planbook/InstanceCard.tsx`
- In the `PopoverContent` header's X button: drop the `removeInstance(instance.id)` call, keep only `setOpen(false)`. Set `aria-label="Close"`.
- Do not touch the card-level hover X outside the Popover.

## BUG 4 — New instances inserted mid-day after deletions
**File:** `src/lib/planbook/store.ts`
- In both `addInstanceFromTemplate` and `addAdHocInstance`, replace `order: existing.length` with:
  ```ts
  order: existing.length === 0 ? 0 : Math.max(...existing.map(i => i.order)) + 1
  ```
**File:** `src/components/planbook/PlannerWorkspace.tsx`
- In `onDragEnd` cross-day move branch, replace the `destCount` calculation with the destination instances array + max-order logic, passing `maxOrder + 1` to `moveInstance` (preserving the prior `0` fallback when destination is empty).

## BUG 5 — Density setting not applied
**File:** `src/components/planbook/DayCell.tsx`
- Read `density` from the store via `usePlanBook` (matching how other settings are read in this file).
- Pass `compact={density === "compact"}` to each `<InstanceCard />` rendered in the cell.
- `InstanceCard` already handles the `compact` prop — no changes there.
- If during implementation density turns out to already be wired through another mechanism that would conflict, stop and flag instead of restructuring.

## Out of scope
No styling, layout, or behavioral changes beyond the above.