## Change 1 — Global compact/expand toggle

**`src/lib/planbook/types.ts`** — Add `compactElements: boolean` to `AppSettings`.

**`src/lib/planbook/store.ts`** — Add `compactElements: false` to `defaultSettings`. Settings persist already; no migration needed (undefined → falsy, treated as expanded).

**`src/components/planbook/DayCell.tsx`** — Read `compactElements` from settings. Change `compact={!expanded}` → `compact={!expanded || compactElements}`. Per-cell kebab Collapse/Expand toggle is unchanged.

**`src/components/planbook/Header.tsx`** — Add a toolbar `Button variant="ghost" size="icon"` between the theme button and the existing layout (placed just before the `ThemeIcon` button). Icon: `Rows3` when `compactElements===false` (title "Compact view"), `LayoutList` when true (title "Expand all"). Click calls `updateSettings({ compactElements: !compactElements })`.

## Change 2 — Day kebab: Move to… and Clear all elements

**`src/lib/planbook/store.ts`** — Add to `Actions` interface and implementations:

- `moveAllInstances(courseId, fromDayKey, toDayKey)`: collect source instances sorted by order; compute `baseOrder = (max order in target day) + 1` (or 0 if target empty); reassign each moved instance `{ dayKey: toDayKey, order: baseOrder + idx }`; leave non-matching instances untouched.
- `clearDay(courseId, dayKey)`: filter out matching instances.

**`src/components/planbook/MoveDayDialog.tsx`** (new) — Clone of `DuplicateDayDialog` but single-select picker. Same week grid; clicking a day sets `picked` to that key (radio-style); confirm calls `moveAllInstances(courseId, sourceDay, picked)`. Disable source day and no-school overrides. Title "Move to…", button label "Move".

**`src/components/planbook/DayCell.tsx`** — Add state `moveOpen`. Add to kebab after "Duplicate to…":
- `Move to…` (icon `ArrowRightLeft`) → opens MoveDayDialog.
- `Clear all elements` (icon `Trash2`, destructive styling) shown only when `instances.length > 0`. Click: `if (window.confirm("Remove all elements from this day?")) clearDay(course.id, dKey)`.

Render `<MoveDayDialog open={moveOpen} onOpenChange={setMoveOpen} courseId={course.id} sourceDay={dKey} />` alongside existing cell dialogs.

## Change 3 — Tag pills in InstanceCard popover

**`src/components/planbook/InstanceCard.tsx`** — Select `tags` from store: `const allTags = usePlanBook((s) => s.tags)`. In `PopoverContent`, between the title row and the "Today's content" field, render:

```
{instance.tagIds.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {instance.tagIds.map(id => {
      const t = allTags.find(x => x.id === id);
      if (!t) return null;
      return (
        <span key={id} className="rounded-full border-l-2 bg-secondary px-2 py-0.5 text-[10px] font-medium"
              style={{ borderLeftColor: colorToken(t.color) }}>
          {t.name}
        </span>
      );
    })}
  </div>
)}
```

No change when instance has no tags.

## Change 4 — Auto-save toast

Mount Toaster and subscribe to sync status. (Modern TanStack stack has no `use-toast`; sonner is the shadcn toast infrastructure here.)

**`src/routes/__root.tsx`** — Import `Toaster` from `@/components/ui/sonner` and render `<Toaster />` inside the root layout body (alongside `<Outlet />`/`<Scripts />`).

**`src/components/planbook/PlannerWorkspace.tsx`** — Add a `useEffect` that subscribes via `subscribeSync`. Track the last status with a ref to detect transitions. Logic:

- If `userId` is null, skip (no toast).
- On transition into `saving`: `const id = toast.loading("Saving…", { id: "planbook-sync" })`.
- On transition into `saved`: `toast.success("Saved", { id: "planbook-sync", duration: 2000 })`.
- On transition into `error`: `toast.error(state.error ?? "Sync failed", { id: "planbook-sync", duration: Infinity })`.

Reuse a fixed `id: "planbook-sync"` so each new status replaces the prior toast. Cleanup: unsubscribe + `toast.dismiss("planbook-sync")` on unmount.

## Out of scope

ExportDialog, print, worksheets, settings page, density behavior, per-cell collapse toggle, history.ts/cloudSync.ts persistence (settings already cloud-synced; UI changes don't add new top-level state).
