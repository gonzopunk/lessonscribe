
## What's broken

1. **No login gate.** A returning user on a fresh browser (no localStorage) sees the onboarding modal instead of `/login`. If they click "Start planning" while a sign-in is in flight, blank defaults can land in the cloud and erase real data.
2. **X button is a no-op.** `OnboardingDialog` passes `open` with no `onOpenChange`, so the built-in close button does nothing.
3. **No recovery.** Once cloud is overwritten, there's no way back.

## Plan

### 1. Route signed-out users to `/login` first

In `PlannerWorkspace.tsx`, replace the current `!onboarded || !course` check with an auth/cloud-aware gate:

- Subscribe to `subscribeSync` and `supabase.auth.getSession()` (already wired in `AccountMenu`).
- If **no session**: render a clean "Welcome to LessonScribe" landing card with two buttons — **Sign in** (→ `/login`) and **I'm new — get started** (sets a session-only flag like `sessionStorage["ls:newUser"]="1"` and proceeds to onboarding). No state writes happen on this screen.
- If **session exists but cloud sync is `loading`**: render a centered loading state. Do not show the onboarding modal during this window — this is the race that causes data loss.
- If **session exists, sync is `saved`/`idle`, and `!onboarded`**: only then show `OnboardingDialog`. At this point we know the cloud snapshot is empty (truly new user) and `completeOnboarding` is safe to push.

### 2. Fix the X button + safe dismissal

In `OnboardingDialog.tsx`:

- Accept `onDismiss?: () => void` and wire `Dialog`'s `onOpenChange={(v) => !v && onDismiss?.()}`.
- Remove `onEscapeKeyDown`/`onPointerDownOutside` preventDefault so Esc and outside-click also dismiss.
- Dismissing only closes the modal — it does **not** call `completeOnboarding`, does **not** touch the store, does **not** touch localStorage.
- In `PlannerWorkspace`, on dismiss return the user to the welcome landing card (clears the `newUser` flag).

### 3. Harden `completeOnboarding` against clobbering

In `cloudSync.ts`, add a guard: before `flushSave` writes, if the local snapshot is empty (no courses, no instances, no templates) AND a remote snapshot already exists, skip the save and re-hydrate from cloud instead. This is a belt-and-suspenders backup for the gate above.

### 4. One-step cloud undo (Recovery snapshot)

**Schema** (migration):
- Add `previous_data jsonb` and `previous_updated_at timestamptz` columns to `plan_snapshots`.

**Server** (`src/lib/planbook/sync.ts`):
- Modify `saveSnapshot`: before upserting, read the current row; if it exists, write its `data`/`updated_at` into `previous_data`/`previous_updated_at` of the new row. (One previous version only — keeps it simple and bounded.)
- Add `restorePreviousSnapshot` server fn: swaps `previous_data` → `data` (and clears `previous_data` so users can't infinite-undo into a stale state).
- Add `getSnapshotMeta` server fn returning `{ hasPrevious, previousUpdatedAt }` for the UI.

**UI** (`AccountMenu.tsx`):
- Add a "Restore previous version" item in the account dropdown, shown only when `hasPrevious` is true. Confirms with an `AlertDialog` showing the previous version's timestamp before swapping.
- After restore, re-hydrate the store from cloud (re-run `handleSignIn` flow).

### 5. Touches summary

- `src/components/planbook/PlannerWorkspace.tsx` — new auth/sync gate, welcome landing card.
- `src/components/planbook/OnboardingDialog.tsx` — `onDismiss` prop, allow Esc/outside/X to close.
- `src/lib/planbook/cloudSync.ts` — empty-local + non-empty-remote guard; expose `hasPrevious` in sync state; `restorePrevious()` helper.
- `src/lib/planbook/sync.ts` — save-with-previous logic, `restorePreviousSnapshot`, `getSnapshotMeta`.
- `src/components/planbook/AccountMenu.tsx` — "Restore previous version" menu item + confirm dialog.
- Migration: add `previous_data`, `previous_updated_at` columns to `plan_snapshots`.

## Out of scope

- Local-only backup snapshots in localStorage — the cloud is the source of truth here; a localStorage backup would create two competing recovery paths and is what the original bug report assumed but isn't the right pattern for a cloud-first app.
- Multi-step undo history — one step back is enough to recover from the failure modes we've actually seen.
- Renaming `plan_snapshots` or restructuring storage.
