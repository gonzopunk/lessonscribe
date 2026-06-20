# Fix: allow inserting at the bottom of a day's list

## Problem

With `closestCenter` collision detection, dragging a template near the bottom of a populated day still resolves `over` to the last instance card, not the day droppable. The current logic only treats that as "insert before", so there is no way to append to the end of a non-empty day.

## Fix — position-aware insertion (before/after the hovered card)

All changes stay within the same three files; no new droppables, no collision-strategy change.

### `src/components/planbook/PlannerWorkspace.tsx`

- Replace `dragOverInstanceId` / `dragOverInstanceRef` with a structured value carrying both id and side:
  - `type DragOverPos = { id: string; side: "before" | "after" } | null`
  - `dragOverPosRef = useRef<DragOverPos>(null)`
  - `const [dragOverPos, setDragOverPos] = useState<DragOverPos>(null)`
- In `onDragOver` (template drags only), when `over.id` matches an instance, compute side from rects:
  - `const overRect = over.rect; const activeRect = active.rect.current.translated;`
  - If `activeRect` exists, compare `activeRect.top + activeRect.height/2` vs `overRect.top + overRect.height/2`. Pointer-center below → `side: "after"`, else `"before"`.
  - Fallback to `"before"` if rects are unavailable.
  - When `over.data.current?.kind === "day"`, clear to `null` (handled by the bottom-of-list indicator branch in DayCell when `isOver` is true).
- In `onDragEnd`, read `dragOverPosRef.current` before clearing. When the hovered instance belongs to the drop target's `dKey`:
  - `side === "before"` → `addInstanceFromTemplate(templateId, dKey, target.order - 0.5)`
  - `side === "after"`  → `addInstanceFromTemplate(templateId, dKey, target.order + 0.5)`
  - No target / mismatched day → existing append call.
- Update the DayCell prop name accordingly: pass `dragOverPos={dragOverPos}` (replaces `dragOverInstanceId`).

### `src/components/planbook/DayCell.tsx`

- Change the prop to `dragOverPos?: { id: string; side: "before" | "after" } | null` (default `null`).
- In the instance list render:
  - Before each card, show the indicator when `isDraggingTemplate && dragOverPos?.id === inst.id && dragOverPos.side === "before"`.
  - After each card, show the indicator when `isDraggingTemplate && dragOverPos?.id === inst.id && dragOverPos.side === "after"`.
  - Keep the existing "bottom of list" indicator when `isDraggingTemplate && isOver && dragOverPos === null && instances.length > 0` (handles the case where the day droppable itself wins the hit-test).

### Store

No changes — `addInstanceFromTemplate` already accepts the fractional `insertOrder`. `target.order + 0.5` slots correctly between the hovered card and whatever follows (or after the last card when the hovered card is last).

## Out of scope

- Instance-to-instance reorder, multi-day batch assign, month view, modals — untouched.
