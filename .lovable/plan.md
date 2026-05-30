# Phase 9 — Accounts & Cloud Sync

Add authentication so users can sign in on any device and pick up where they left off.

## Decisions (from your answers)

- **Sign-in:** Email + password, plus Google (via Lovable broker).
- **No profile table.**
- **Existing local data:** stays local. Cloud accounts start fresh.
- **Sync model:** cloud-only when signed in. Requires connectivity to save — no offline editing in this phase.
- Signed-out visitors keep the existing local-only experience unchanged.

## What gets built

### 1. Enable Lovable Cloud
Provisions auth + database, then enables Google as a social provider.

### 2. Database — one table
```text
plan_snapshots
  user_id    uuid PK  → auth.users.id ON DELETE CASCADE
  data       jsonb    (serialized PlanBookState, minus volatile UI bits)
  updated_at timestamptz
```
- RLS: each user can SELECT/INSERT/UPDATE/DELETE only `where user_id = auth.uid()`.
- Grants: `authenticated` full CRUD, `service_role` all.
- One row per user. The app already serializes its whole state — a single JSONB column matches that shape with no refactor.

### 3. Auth UI
- New `/login` route: email+password form + "Continue with Google" button.
- Header gets an **AccountMenu**: signed-out → "Sign in"; signed-in → email + "Sign out".
- Root `onAuthStateChange` listener invalidates router + query cache so the planner switches between local and cloud mode cleanly.

### 4. Sync layer (`src/lib/planbook/sync.ts`)
Two protected server functions:
- `loadSnapshot()` → `{ data, updated_at } | null`
- `saveSnapshot(state)` → upsert on `user_id`

Wire-up in `store.ts`:
- Mode-aware persist storage:
  - **Signed out:** today's `localStorage` behavior (unchanged).
  - **Signed in:** in-memory store hydrated from `loadSnapshot()` on sign-in; writes debounced ~600ms and flushed via `saveSnapshot()`.
- On sign-in: load cloud snapshot. If no row exists yet, seed it from a blank state (we do **not** push localStorage up).
- On sign-out: clear the in-memory store and fall back to localStorage.
- Last-write-wins by `updated_at`.

### 5. Sync feedback
- Tiny "Synced • Xs ago" indicator in the header when signed in.
- Toast + retry on save failure; pending write kept in memory until success or sign-out.
- Clear "You're offline — changes can't be saved" banner when `navigator.onLine` is false while signed in (since this phase requires connectivity).

## Files

**New**
- `src/routes/login.tsx`
- `src/lib/planbook/sync.ts` (server fns)
- `src/components/planbook/AccountMenu.tsx`
- Supabase migration: `plan_snapshots` + RLS + grants

**Edited**
- `src/routes/__root.tsx` — `onAuthStateChange` listener, auth context
- `src/router.tsx` — auth context wiring
- `src/start.ts` — append `attachSupabaseAuth` to `functionMiddleware`
- `src/lib/planbook/store.ts` — pluggable storage, hydrate-on-login, debounced cloud writes, offline guard
- `src/components/planbook/Header.tsx` — mount AccountMenu + sync indicator

## Technical notes

- **Planner stays at `/` (public).** Signed-out users continue using the local-only planner; the auth state inside the store decides whether writes go to localStorage or cloud. No hard route gate. (Say the word if you'd rather force sign-in to use the planner.)
- **Volatile fields excluded from cloud:** `anchorDate`, `selectedFilterTagIds`, `settings.viewMode` remain device-local so each device keeps its own view position.
- **No edge functions.** All server work via `createServerFn`.
- **Google provider** enabled in the same turn via `supabase--configure_social_auth`.
- **Offline behavior is intentionally limited** in this phase. If you later want true plane-mode editing, we'd revisit the schema (normalize per-row) and add an outbox queue — flagged below.

## Out of scope (next phases if you want)
- Offline editing with sync-on-reconnect (requires normalized schema)
- Password reset flow (`/reset-password`)
- Importing existing localStorage data into a new cloud account
- Real-time multi-tab/multi-device sync
- Profile data (display name, avatar)
