# Rebrand: PlanBook → LessonScribe

The user-facing name is centralized. Internal identifiers (`usePlanBook`, the `planbook/` folder, `PlanBookState` type, DB table `plan_snapshots`) stay as-is — they're not visible to users, and renaming them is churn with zero user benefit (and would force a data migration for `plan_snapshots`).

## Changes

1. **`src/lib/planbook/constants.ts`** — change `APP_NAME = "PlanBook"` to `APP_NAME = "LessonScribe"`. This single constant drives the header logo/link and any other display use.

2. **`src/styles.css`** — update the file header comment from "PlanBook design system" to "LessonScribe design system".

## Already correct (no change needed)

- `src/routes/__root.tsx` head meta already uses "LessonScribe" (title, og:title, twitter:title, description).
- Published domain is already `lessonscribe.lovable.app`.

## Out of scope (intentionally)

- Internal symbol names (`usePlanBook`, `PlanBookState`, `src/lib/planbook/*`, `plan_snapshots` table). These are implementation details; renaming risks bugs in the just-shipped cloud sync and would require a DB migration without any user benefit.
