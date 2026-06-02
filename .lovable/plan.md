# Fix cloud sync data loss

## Root cause (confirmed against your database)

Your cloud row currently holds **0 instances, 1 template** (a near-fresh state from after you logged back in), while `previous_data` still has the real work: **17 instances, 5 templates, your full course setup**. So nothing is permanently lost — it's sitting in the rollback slot — but the bug that overwrote it must be fixed before the same thing happens again.

The cause is a one-level shape mismatch between save and load in `src/lib/planbook/cloudSync.ts` / `src/lib/planbook/sync.ts`:

- `saveSnapshot` is called as `saveSnapshot({ data: { data: snap } })`.
- In a `createServerFn` handler, the validated input is already destructured as `data`, so inside the handler `data.data` equals `snap` (the flat snapshot).
- The DB row therefore stores the snapshot **flat** (`{ courses, instances, templates, ... }` at the top level of `data`). Verified: `jsonb_object_keys(data)` returns `tags, courses, instances, ...` — no nested `data` key.
- But on load, `cloudSync.handleSignIn` does `const snap = (remote.data as { data?: ... }).data` — i.e. it unwraps one extra level that doesn't exist. So `snap` is `undefined`, `applyCloudShape` is never called, and the UI shows nothing.
- You then start re-entering data, the debounced save fires, and the now-near-empty local state overwrites the cloud. The previous (real) snapshot is rolled into `previous_data` — exactly what we see in the DB.

Two smaller related issues:

1. `pickCloudShape` omits `weekMeta`, so your weekly-notes data is never synced to the cloud at all (`data ? 'weekMeta'` is `false` in both current and previous rows).
2. The empty-snapshot guard inside `flushSave` re-reads `remote.data.data` the same broken way, so even its "refuse to overwrite" recovery hydrates with nothing.

## Plan

### 1. Recover your lost data first (one click)
Before changing code, use the existing in-app **"Restore previous"** action (already wired to `restorePreviousSnapshot`) to bring back the 17-instance snapshot. After the fix below ships, do this once and your real plan is back.

If the UI doesn't currently expose that button on the home screen, I'll surface it on the sync-status chip in the header so you can click Restore.

### 2. Fix `src/lib/planbook/cloudSync.ts`
- In `handleSignIn`: replace `const snap = (remote.data as { data?: ... }).data; if (snap) applyCloudShape(snap);` with `applyCloudShape(remote.data as Partial<PlanBookState>)`.
- In `flushSave`'s re-hydrate guard: same fix — call `applyCloudShape(remote.data as Partial<PlanBookState>)` directly.
- In `restorePrevious`: use `restored.data` directly instead of `restored.data.data`.

### 3. Fix `src/lib/planbook/sync.ts` (defensive)
Keep storing snapshots flat (matches existing rows, no migration needed), but tighten the call site by changing `saveSnapshot({ data: { data: snap } })` to `saveSnapshot({ data: snap })`. The serverFn already does `row.data = data.data`, so this stays correct and reads/writes are symmetric.

### 4. Include `weekMeta` in the cloud shape
Add `weekMeta: s.weekMeta` to `pickCloudShape` so weekly notes stop being device-local.

### 5. Stronger anti-clobber guard
Tighten `isEmptySnapshot` to also consider it "empty" when local has **fewer** instances/templates than `remoteHasSnapshot` implies, OR — simpler — never overwrite the cloud during the first save after sign-in unless the user has explicitly edited something post-hydration. Concretely: track a `hydratedAt` timestamp inside cloudSync, and in `flushSave` if `Date.now() - hydratedAt < 1500ms` and local is shallower than what we just loaded, skip the save and log a warning. This prevents the exact race that just hit you.

### 6. Smoke-test
- Sign in fresh on a clean browser profile → verify Network shows `loadSnapshot` returning the flat snapshot and the UI populates.
- Edit one element → verify `saveSnapshot` round-trips and the cloud row keeps all 11 top-level keys including `weekMeta`.
- Sign out / sign in again → verify nothing is clobbered.

No changes to auth flow, routes, worksheet generator, or any other feature.
