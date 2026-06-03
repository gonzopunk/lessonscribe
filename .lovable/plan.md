## Goal

Eliminate input lag in InstanceCard, PlanModal, and WeekNotesDialog. Today every keystroke runs through the Zustand store, which triggers the persist middleware to synchronously `JSON.stringify` and write the entire planner state to localStorage. We'll keep the UI on local state and debounce store updates to 300ms.

## Step 1 — New file: `src/lib/planbook/hooks.ts`

Export one hook:

```ts
useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay: number): T
```

- Holds the current timeout in a `useRef`.
- Holds the latest `fn` in a `useRef` updated each render (so the stable returned function always calls the freshest closure).
- Returns a `useCallback`-memoized function (stable identity) that clears the pending timeout and schedules a new one calling `fnRef.current(...args)` after `delay`.
- Cleans up the timeout on unmount via `useEffect`.

## Step 2 — `src/components/planbook/InstanceCard.tsx`

- Add `useState` for `content` and `instanceNotes` (initialized from `instance.content` / `instance.instanceNotes`). `durationOverride` stays as-is.
- Add `useEffect` keyed on `[open, instance.id]` that, when `open` is true, resets both local values from the current `instance` props.
- Create two debounced callbacks (300ms) via `useDebouncedCallback`, one for content and one for notes, each calling `updateInstance(instance.id, { ... })`.
- Wire the content `Input` and notes `Textarea` so `onChange` sets local state immediately and schedules the debounced store update. `value` reads from local state.
- Leave the duration `Input` untouched.

## Step 3 — `src/components/planbook/PlanModal.tsx`

- Add `localMeta` state typed as `DayMeta`, initialized from `meta` (fall back to a safe default when `meta` is null at first render — guarded by the existing `if (!course || !dayKey || !meta) return null` for actual use).
- Add `useEffect` keyed on `[dayKey]` (and `meta` identity is not the dep — we want to re-seed only on day change) that resets `localMeta` from `meta`. Use a ref or check `meta` inside to avoid resetting mid-typing.
- Single `debouncedUpdateDayMeta = useDebouncedCallback((patch: Partial<DayMeta>) => updateDayMeta(course.id, dayKey, patch), 300)`.
- Update every text field (`objectives`, `standards`, `notes`, each `sectionNotes[secId]`, `differentiationNotes`, `behaviorNotes`, `materialsNotes`, `reflection`) to:
  - `onChange`: `setLocalMeta(prev => ({ ...prev, <field>: value }))` and `debouncedUpdateDayMeta({ <field>: value })`.
  - For `sectionNotes`, both the local merge and the patch include the merged `sectionNotes` object.
  - `value` reads from `localMeta`.
- Replace `meta` reads in the JSX text fields with `localMeta`. Non-input reads (e.g. computing `hasContent` for the extras chevron) also read `localMeta` for consistency.

## Step 4 — `src/components/planbook/WeekNotesDialog.tsx`

- Add `localWm` state typed as `WeekMeta`, initialized from `wm`.
- `useEffect` keyed on `[weekKey]` resets `localWm` from the current `wm`.
- `debouncedUpdateWeekMeta = useDebouncedCallback((patch: Partial<WeekMeta>) => updateWeekMeta(courseId, weekKey, patch), 300)`.
- For each `Textarea` in the `fields` map: `onChange` updates `localWm` immediately and schedules `debouncedUpdateWeekMeta({ [key]: value })`. `value` reads from `localWm[f.key]`.
- "Clear week notes" button: build the cleared patch, call `updateWeekMeta(courseId, weekKey, patch)` directly (no debounce), and `setLocalWm(blankWeekMeta())` immediately.

## Out of scope

- No changes to the zustand store, persist middleware, cloud sync, or any other component.
- No visual / styling / layout changes.
- `durationOverride` in InstanceCard is unchanged.
