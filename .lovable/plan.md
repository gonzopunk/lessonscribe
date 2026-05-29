## Problem

After completing onboarding, the app crashes with `Maximum update depth exceeded` originating from `@radix-ui/react-scroll-area`. The stack trace points at the `ScrollArea` inside `src/components/planbook/ElementBank.tsx` (line 78). This is a well-known Radix ScrollArea behavior: when placed inside a flex column with `flex-1` but no `min-h-0` constraint on ancestors, the viewport's `ResizeObserver` ping-pongs height measurements forever.

## Fix

Two surgical edits, frontend only:

1. **`src/components/planbook/ElementBank.tsx`** — add `min-h-0` to the `<ScrollArea>` and make its viewport explicitly sized:
   - Change `<ScrollArea className="flex-1">` to `<ScrollArea className="min-h-0 flex-1">`.
   - As a belt-and-braces measure, replace the `ScrollArea` with a plain `<div className="min-h-0 flex-1 overflow-y-auto">` if the loop persists (Radix ScrollArea isn't needed here — a native scroll container is sufficient and avoids the known bug entirely).

2. **`src/components/planbook/PlannerWorkspace.tsx`** — ensure the parent flex chain doesn't force overflow. The `<main className="flex flex-1 overflow-hidden">` is fine, but the inner grid column wrapping the day cells should also include `min-h-0` so the ElementBank sibling can compute a stable height. Add `min-h-0` to `<main>`.

## Verification

- Reload preview, complete onboarding, confirm planner renders without the error fallback.
- Check console for the React maximum-update warning — should be gone.
- Drag an element from the bank onto a day to confirm dnd-kit still works.

No business-logic, store, or data-model changes.