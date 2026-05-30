## Phase 2 status

Already shipped: `PlanModal` (lesson + sub, in-place editing, compact toggle, print/PDF via `window.print` with per-color styling), `DuplicateDayDialog`, per-course `subDefaults` in Settings, day-meta editing. Print path uses a styled new-window — equivalent UX to `@react-pdf/renderer` without adding a Worker-incompatible client dep, so we keep it.

Small Phase 2 gap to close as part of this batch:
- **Copy Week action** on the week header (next to the existing week range label) → opens a lightweight picker that calls `duplicateDay` for each weekday Mon→Fri into the matching weekday of one or more target weeks.

## Phase 3 — Month calendar + iCal import

### 1. Month view

**Store + settings**
- Add `viewMode: "weeks" | "month"` to `AppSettings` (default `"weeks"`). Hydrate default.
- Add `monthCourseIds: string[]` to `AppSettings` for which courses appear as bands in month view (default = `[activeCourseId]` on first switch).

**Header (`Header.tsx`)**
- Add a segmented control: `Weeks | Month`. In Weeks mode the existing 1/2/3/4 picker stays. In Month mode it's hidden; prev/next shift by one calendar month.
- Title becomes `MMMM yyyy` in month mode.

**New `MonthView.tsx`** (sibling of `PlannerWorkspace`'s weeks grid; rendered conditionally inside `PlannerWorkspace`)
- 7-col grid Sun–Sat (or Mon–Sun, matching existing `mondayOf`), showing the full month plus leading/trailing days to fill weeks.
- Each cell shows: date number, override label (if any, muted), and one **color band per selected course** with a tiny element-count number. Band uses `colorTokenSoft(course.color)` bg + `colorToken` left border, matching the rest of the color system.
- Click a band → opens `PlanModal` for that course+day. Click empty area of cell → opens the override dialog (same as weeks view).
- Multi-course chooser: small popover above the grid with checkboxes for each course, writes to `monthCourseIds`.
- No drag-and-drop in month view (out of scope; weeks view stays the editing surface).

### 2. Range-based PDF / print export

- New "Export range" button in `Header`. Opens a dialog: date range (defaults to current month), course multi-select (defaults to `monthCourseIds`), mode toggle Lesson | Sub, compact toggle.
- Reuses the existing `PlanModal.print` HTML pipeline: iterates `(course × day)` pairs in order, emits one styled section per day with a page-break between days. Skips days with no instances unless "include empty days" is checked.
- Same `colorToHex`/`hexMix` helpers, same legend rules per day.

### 3. iCal import via server route

**Server route** `src/routes/api/public/ical-proxy.ts`
- `GET` with `?url=` query param. Validate with Zod (must be `https://` URL, max length 2048).
- `fetch(url, { headers: { Accept: "text/calendar" } })`, 8s timeout via `AbortController`.
- Return `text/calendar` body with `Cache-Control: public, max-age=300`. On failure return JSON `{ error }` with appropriate status.
- Why `/api/public/`: needs to be reachable without app auth so the client can call it from any preview/published origin. No PII, no writes — read-only proxy.

**Client integration**
- `bun add ical.js`.
- New helper `src/lib/planbook/ical.ts`:
  - `fetchAndParseIcal(url: string): Promise<{ dayKey: string; label: string; kind: OverrideKind }[]>`
  - Calls `/api/public/ical-proxy?url=...`, parses with `ical.js`, filters all-day events, maps SUMMARY → kind (`no school` / `holiday` → `no_school`, `assembly` → `assembly`, `testing` / `test` → `testing`, else `custom`), expands multi-day events into individual day keys.
- Store action `syncIcal()`:
  - Reads `settings.icalUrl`, calls helper, writes results into `overrides` with `source: "ical"` **only when** no existing override has `source: "manual"` for that day (user overrides win).
  - Tracks `lastIcalSyncAt: number | null` in `AppSettings` for the UI.
- `settings.tsx`:
  - Next to the iCal URL field add a "Sync now" button that calls `syncIcal()` and shows last-sync timestamp + toast on success/failure.
  - Add "Clear iCal-sourced overrides" secondary button.

### Out of scope (defer)

- True drag-and-drop in month view.
- Auto background sync on app load.
- Recurring rule (`RRULE`) expansion beyond what `ical.js` returns natively for the visible window.
- Switching the print pipeline to `@react-pdf/renderer`.

### Files touched

**New**
- `src/components/planbook/MonthView.tsx`
- `src/components/planbook/CopyWeekDialog.tsx`
- `src/components/planbook/RangeExportDialog.tsx`
- `src/routes/api/public/ical-proxy.ts`
- `src/lib/planbook/ical.ts`

**Edited**
- `src/lib/planbook/types.ts` — `viewMode`, `monthCourseIds`, `lastIcalSyncAt`.
- `src/lib/planbook/store.ts` — defaults + hydrate, `syncIcal`, `clearIcalOverrides`.
- `src/components/planbook/Header.tsx` — view toggle, month nav, Export range + Copy week buttons.
- `src/components/planbook/PlannerWorkspace.tsx` — conditional render of `MonthView` vs weeks grid.
- `src/components/planbook/PlanModal.tsx` — extract `renderPlanHTML(...)` so `RangeExportDialog` can reuse it.
- `src/routes/settings.tsx` — Sync now / Clear iCal / last-sync display.
- `package.json` — `ical.js`.
