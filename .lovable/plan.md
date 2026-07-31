# Drag-and-drop: cross-day insertion indicator + cancellable drags

Two behaviors change: dragging an existing element from one day to another now shows the same insertion line templates get (and drops at that exact position), and releasing a drag outside any day cell cancels it instead of forcing a drop.

## Changes

### src/components/planbook/PlannerWorkspace.tsx

1. **Collision detection** — swap `closestCenter` for `pointerWithin` (import + `DndContext` prop). Only droppables actually under the pointer match, so releasing over the element bank or empty space gives `over === null` and the existing early return in `onDragEnd` cancels cleanly.
2. **Track source day** — new state `dragSourceDayKey`. Set in `onDragStart` from `active.data.current.dayKey` when the dragged item kind is `"instance"`; stays null for template drags.
3. **`onDragOver` handles both kinds** — proceed for `"template"` and `"instance"`, return early otherwise. Existing hovered-instance resolution and before/after side computation (active rect center vs. over rect center) is unchanged. Extra guard for instance drags: if the hovered instance's `dayKey` equals `dragSourceDayKey`, clear `dragOverPosRef.current` / `dragOverPos` and return — same-day reordering already previews via the sortable strategy.
4. **Honor drop position on cross-day moves** — in `onDragEnd`'s instance branch, the `destKey !== moving.dayKey` path looks up the target instance from `overPos`; if it exists and its `dayKey === destKey`, call `moveInstance(moving.id, destKey, target.order + delta)` with delta `+0.5` for `"after"` and `-0.5` for `"before"`. Otherwise keep the existing `maxOrder + 1` append (drop on empty day background).
5. **Consistent cleanup** — reset `dragSourceDayKey` in `onDragEnd`, and add an `onDragCancel` that clears `activeDragId`, `draggingTemplateId`, `dragSourceDayKey`, `dragOverPosRef.current`, and `dragOverPos`.
6. **DayCell props** — rename `isDraggingTemplate` to `isDragActive` passing `!!draggingTemplateId || !!dragSourceDayKey`, add `dragSourceDayKey={dragSourceDayKey}`, keep `dragOverPos`.

### src/components/planbook/DayCell.tsx

- Rename prop `isDraggingTemplate` to `isDragActive` (default `false`); add `dragSourceDayKey?: string | null` (default `null`).
- After `dKey` is computed: `const showIndicators = isDragActive && dragSourceDayKey !== dKey;`
- Use `showIndicators` in all three indicator spots (before line, after line, bottom line when `isOver` and `dragOverPos === null`).

## Not touched

Sensors, `DragOverlay`, store actions, `MoveDayDialog`, and same-day reordering (still `arrayMove` + `reorderInDay`). No other files.
