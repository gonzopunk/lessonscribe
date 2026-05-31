## Root causes

All three bugs trace back to two issues.

### 1. `new Date("yyyy-MM-dd")` parses as UTC midnight
JavaScript's `Date` constructor treats a bare `yyyy-MM-dd` string as UTC midnight. In any negative-UTC timezone (most of the Americas) that renders as the **previous day** in local time. This is the cause of two of the three bugs.

- **Toolbar dates don't match the week view.** In `Header.tsx`, `anchorDate = new Date(anchor)` becomes the previous calendar day in local time, so `formatWeekRange(anchorDate)` prints the wrong week. Meanwhile `PlannerWorkspace.tsx` does `mondayOf(new Date(anchor))`, which shifts to the previous local day and then snaps back to that day's Monday — a different week entirely. Result: toolbar label and grid disagree.
- **Single-day print preview shows the previous day.** `ExportDialog.buildDoc` does `new Date(from)` / `new Date(to)` and iterates with `addDays`, then keys days with `format(d, "yyyy-MM-dd")`. Because the start Date is already shifted one day earlier in local time, the rendered day is off by one.

Fix: use the existing timezone-safe `parseDayKey` (date-fns `parseISO`) for every `yyyy-MM-dd → Date` conversion, instead of `new Date(str)`.

### 2. Export dialog "vibrates"
`PrintPreview` runs a `ResizeObserver` on the scroll container and writes `scale` back into a child whose width is `pageW * scale`. When the child width crosses the container's available width, a horizontal scrollbar toggles, the container's `clientWidth` changes by the scrollbar's thickness, the observer fires again, and we get a steady-state oscillation (classic ResizeObserver feedback loop). It's especially visible with the iframe srcDoc swapping in after the 150 ms debounce, which retriggers layout.

Fix: prevent the loop by (a) measuring against a stable width source (use `getBoundingClientRect().width` and round/clamp before comparing) and (b) preventing horizontal overflow on the outer wrapper so the scrollbar doesn't toggle. Concretely: add `overflow-x: hidden` (keep `overflow-y: auto`) on the scaled-page scroll area, and only call `setScale` when the new value differs from the current one by more than a small epsilon (e.g. 0.005).

## Changes

### `src/components/planbook/Header.tsx`
- Import `parseDayKey` from `@/lib/planbook/dates`.
- Replace `const anchorDate = new Date(anchor)` with `const anchorDate = parseDayKey(anchor)`.
- Replace `const lastWeekStart = new Date(anchorDate)` + mutation with `addDays(anchorDate, (weeksInView - 1) * 7)` (already importing `date-fns` helpers).
- Replace the "today" button's `new Date().toISOString().slice(0, 10)` with `dayKey(new Date())` so the local-day key is used (matches the store's convention).

### `src/components/planbook/PlannerWorkspace.tsx`
- Replace `mondayOf(new Date(anchor))` with `mondayOf(parseDayKey(anchor))`.
- Replace `monthAnchor={new Date(anchor)}` with `monthAnchor={parseDayKey(anchor)}`.

### `src/components/planbook/DuplicateDayDialog.tsx`
- Replace `mondayOf(new Date(anchor))` with `mondayOf(parseDayKey(anchor))`.

### `src/lib/planbook/store.ts`
- Replace `new Date(get().anchorDate)` (line 443) with `parseDayKey(get().anchorDate)` (import already available).

### `src/components/planbook/ExportDialog.tsx`
- Import `parseDayKey`.
- In `buildDoc`: `const start = parseDayKey(from); const end = parseDayKey(to);`
- In `exportNow`: compare with `parseDayKey(to) < parseDayKey(from)`.
- (Leave `monthStart` / `monthEnd` alone — those are constructed from numeric args, which is timezone-safe.)

### `src/components/planbook/PrintPreview.tsx`
- In the scroll container, change `className="flex-1 overflow-auto p-3"` to `className="flex-1 overflow-y-auto overflow-x-hidden p-3"`.
- In the `compute` callback, read width via `el.getBoundingClientRect().width`, compute `next = Math.min(1, Math.max(0.3, (w - 24) / pageW))`, and only call `setScale` if `Math.abs(next - scale) > 0.005`. Use a ref to hold the latest scale so the observer callback stays stable without re-subscribing.

## Out of scope
- Other `new Date(...)` call sites that already receive proper inputs (ISO timestamps with time, numeric args, or Date objects) are untouched.
- No data model or persisted-format changes; `anchorDate` stays a `yyyy-MM-dd` string.
- No design or copy changes.
