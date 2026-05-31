## Problem

The toolbar date label ("Jun 28 – Jul 2 – Jul 23") doesn't match what's actually rendered (Week of Jun 22 → Jul 17). Rather than hunt down yet another timezone/parse mismatch in the label formatter, remove the label entirely. The week column headers already show the dates accurately. Move week-paging arrows down next to those headers.

## Changes

### `src/components/planbook/Header.tsx`
- Remove the toolbar date cluster: the `ChevronLeft`/"today" button/`ChevronRight` group between the course tabs and the Weeks/Month toggle.
- Remove now-unused imports: `ChevronLeft`, `ChevronRight`, `formatWeekRange`, `parseDayKey`, `addDays`, `mondayOf`, `format`, `shiftAnchor`, `setAnchor`, `anchor`, `anchorDate`, `lastWeekStart`, `monthShift`, and the `toKey` alias if no longer used. Keep month-shift behavior available via the new week-header arrows (weeks view) and the existing Month-view path — but since arrows now live in the week column header, drop `monthShift` from Header entirely. For Month view, paging will be handled inside `MonthView` (see below).

### `src/components/planbook/PlannerWorkspace.tsx`
- In the weeks-view column header (currently `<div className="flex items-center justify-between border-b border-border pb-2">` wrapping the `<h2>Week of …</h2>`), add a left chevron button on the **first** week column and a right chevron button on the **last** week column.
- Wire them to `usePlanBook.getState().shiftAnchor(-1)` and `shiftAnchor(1)` respectively (one week at a time, per the user's spec).
- Use `Button variant="ghost" size="icon"` with `ChevronLeft`/`ChevronRight` from lucide-react, sized `size-4`, with `aria-label="Previous week"` / `"Next week"`.
- Layout: header row keeps `justify-between`; left column renders `[◀ | Week of …]`, right column renders `[Week of … | ▶]`, middle columns render just the heading (with an invisible spacer or simply no button — `justify-between` still works with a single child).

### `src/components/planbook/MonthView.tsx` (light touch)
- Add small prev/next month chevron buttons in the existing month header so month navigation isn't lost when the toolbar buttons go away. (If MonthView already has its own header with arrows, no change needed — I'll confirm during implementation and skip if present.)

## Out of scope
- No date-parsing changes. The week column header (`formatWeekRange(wkMonday)`) is already correct because `wkMonday` comes from `mondayOf(parseDayKey(anchor))`.
- No store/data changes. `shiftAnchor` already exists and moves the anchor by N weeks.
- No styling changes to surrounding toolbar items.
