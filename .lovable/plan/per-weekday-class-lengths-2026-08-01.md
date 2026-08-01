# Per-weekday class lengths

Replace the hardcoded "Wednesday is the short day" assumption with a per-weekday minutes map on each course, so any bell schedule works.

## What changes for users

- Settings > course now shows five minute inputs (Mon–Fri) instead of "Period length" + "Wednesday length", with the helper line "Class length in minutes for each day."
- Onboarding asks a single "Class period length (minutes)" (default 50), applied to all five days, with the note "If some days are shorter, you can set each day individually in Settings."
- The day cell "short" badge now appears on whichever day is actually shorter, not always Wednesday.
- Existing courses keep their current lengths — legacy values migrate automatically (Mon/Tue/Thu/Fri from period length, Wed from Wednesday length).

## Technical details

1. `src/lib/planbook/types.ts` — add `DayMinutes { mon,tue,wed,thu,fri: number }`; add `dayMinutes: DayMinutes` to `Course`; make `periodMinutes?`/`wednesdayMinutes?` optional and `@deprecated` (kept so pre-migration data parses).

2. New `src/lib/planbook/courseSchedule.ts` (separate module to avoid a circular import with the store):
   - `normalizeCourse(c): Course` — returns `c` unchanged when `dayMinutes` already has five numeric keys; otherwise derives it from the legacy fields, defaulting missing/non-numeric values to 50, preserving all other fields.
   - `minutesForDay(course, date)` — maps `getDay()` 1–5 to the matching key; weekends fall back to `mon`; missing `dayMinutes` falls back to `periodMinutes ?? 50`.
   - `isShortDay(course, date)` — true when that day's minutes are below the max of all five.

3. `src/lib/planbook/store.ts` — in the existing defensive `merge` (no `SCHEMA_VERSION` bump, no zustand `migrate`), return `courses: (p.courses ?? []).map(normalizeCourse)`. `completeOnboarding`'s `course` param type now requires `dayMinutes`; no logic change inside the action.

4. `src/lib/planbook/cloudSync.ts` — map incoming `courses` through `normalizeCourse` inside `applyCloudShape` so cloud/restored snapshots migrate too (`applyRestoredSnapshot` routes through it).

5. Read sites switched to `minutesForDay(course, date)`:
   - `src/components/planbook/DayCell.tsx` (also swaps the `isWednesday` short-day condition for `isShortDay`)
   - `src/components/planbook/PlanModal.tsx`
   - `src/lib/planbook/printPlan.ts`

6. `src/routes/settings.tsx` — five Mon–Fri number inputs writing `dayMinutes.<key>` via `updateCourse`, same styling/min/parseInt handling; helper line above. A newly created course defaults to 50 minutes on all five days (dropping the old 40-minute Wednesday, which was specific to one school). Existing courses keep their real values via `normalizeCourse`.

7. `src/components/planbook/OnboardingDialog.tsx` — single minutes input replacing `reg`/`wed`, expanded into all five keys on submit; helper line below. No other changes to the dialog.

Out of scope: flexible section counts, multi-course onboarding, worksheet field mappings / `DayOffset`.
