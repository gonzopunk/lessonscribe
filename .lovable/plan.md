# Diagnosis

The debounce fix is working correctly — it's not the bug. What it did was *unmask* a pre-existing problem.

**Root cause:** the Zustand store persists the entire state tree to `localStorage` on every update, and the store contains worksheet template blobs (`pdfBase64`, `docxBase64` on `WorksheetTemplate`). Once a user has uploaded any worksheet PDFs, every persist write has to:

1. `JSON.stringify` the full state, including multi-MB base64 strings
2. Synchronously write that string to `localStorage`

That's a single main-thread task that can easily run 5–10 seconds.

**Why it felt different before vs. after the debounce fix:**

- **Before:** every keystroke triggered the write, so typing was uniformly slow — every character took a beat, which the user had adapted to.
- **After:** while typing fast, no write happens (timer keeps resetting). The moment the user pauses for >300 ms, the write fires — and that synchronous write blocks the *next* keystroke for 5–10 seconds. The lag feels much bigger because it's bursty and lands right when the user resumes typing.

This is exactly Tier 1 #1 from the optimization review ("worksheet templates stored as base64 in localStorage"). The debounce work made it acute.

# Fix

Stop persisting the heavy blobs through the Zustand `persist` middleware. Keep the lightweight worksheet template metadata in localStorage (so the UI still lists templates, names, courses, etc.), and move the actual `pdfBase64` / `docxBase64` payloads to IndexedDB, loaded on demand.

## Technical plan

1. **Add `idb-keyval`** (~600 B, no native deps) for IndexedDB access.

2. **New file `src/lib/planbook/worksheetBlobs.ts`** — tiny wrapper:
   - `saveBlob(id: string, blob: { pdfBase64?: string; docxBase64?: string })`
   - `loadBlob(id: string): Promise<{ pdfBase64?: string; docxBase64?: string } | undefined>`
   - `deleteBlob(id: string)`
   - Uses one keyval store named `planbook-worksheet-blobs`.

3. **`src/lib/planbook/store.ts`**
   - Add a `partialize` option to the `persist` config that returns the full state but strips `pdfBase64` and `docxBase64` from every entry in `worksheetTemplates` before serialization. Net effect: localStorage contains template metadata only.
   - In `addWorksheetTemplate` / `updateWorksheetTemplate`: if the incoming template carries `pdfBase64` or `docxBase64`, call `saveBlob(id, …)` and store the template in state with those fields stripped (or kept in-memory only — see step 4).
   - In `removeWorksheetTemplate`: call `deleteBlob(id)`.
   - Bump `SCHEMA_VERSION` and add a `migrate` step that, for any pre-existing persisted template still carrying base64, moves it to IndexedDB and drops it from the persisted payload. The migration is synchronous-safe because it just defers the IndexedDB writes (fire-and-forget) and returns the slimmed state.

4. **Runtime blob access**
   - Add a `loadWorksheetBlob(id)` helper (in `worksheetBlobs.ts`) and a small in-memory cache (`Map<id, blob>`) so the same template doesn't hit IndexedDB twice in a session.
   - Update the call sites that currently read `template.pdfBase64` / `template.docxBase64` directly to go through this helper (await it where they already are async; otherwise wrap in a small `useEffect` + state). I'll inventory those call sites during implementation — they're the worksheet preview / fill / export flows.

5. **Keep the debounce fix as-is.** It's correct and still wanted: even with blobs removed, localStorage writes of the rest of the state on every keystroke would still cause smaller (but real) jank, especially as the plan book grows.

## Out of scope

- No visual or layout changes.
- No changes to `InstanceCard`, `PlanModal`, `WeekNotesDialog`, or the debounce hook from the previous fix.
- No cloud-sync changes.
- Not touching other Tier 1 items (cloud sync hardening, etc.) — separate work.

## Verification

- Reload with existing worksheet templates: migration moves blobs to IndexedDB; templates still render and can be opened/filled/exported.
- Type continuously in `PlanModal` and `InstanceCard`: no multi-second freeze on pause.
- Inspect `localStorage` planbook key: size drops dramatically; no `pdfBase64` / `docxBase64` strings present.
- Inspect IndexedDB `planbook-worksheet-blobs` store: one entry per template that had a blob.
