## Objective
Move the existing filter bank from its standalone position below the main header into the ElementBank sidebar, placing it directly below the "Element Bank" header and above the search bar. Remove the old standalone filter bank. Preserve all existing filter behavior.

## Current State
- `FilterBar.tsx` is a standalone component rendered in `PlannerWorkspace.tsx` between `<Header />` and the main workspace content.
- `ElementBank.tsx` is the right-hand sidebar with a header, search bar, and element list.
- `FilterBar` is only imported and used in `PlannerWorkspace.tsx` (no other usages).

## Changes Required

### 1. `src/components/planbook/ElementBank.tsx`
- Import `colorToken`, `colorTokenSoft`, and `cn` (currently only imported in `FilterBar.tsx`).
- Add store selectors: `selectedFilterTagIds`, `toggleFilterTag`, `setFilterTags`.
- Insert a new "Filters" section between the existing header (`<div className="flex items-center justify-between border-b...">`) and the search bar (`<div className="border-b border-border p-3">`).
- The new section should:
  - Have a "Filters" label styled consistently with other small uppercase labels in the sidebar.
  - Include the "All" reset button and per-tag toggle buttons, with identical active/inactive styling and behavior as the current `FilterBar.tsx`.

### 2. `src/components/planbook/PlannerWorkspace.tsx`
- Remove the `FilterBar` import.
- Remove the `<FilterBar />` JSX line.

### 3. `src/components/planbook/FilterBar.tsx`
- This file becomes unused and should be deleted after the above changes are verified working.

## Out of Scope
- No changes to filter logic, store selectors, or state management.
- No changes to the visual styling of individual filter buttons beyond what is needed for the new container layout.
- No changes to ElementBank collapsed state behavior.