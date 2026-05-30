## Goal

Show a live, paper-like print preview next to the Export dialog controls that updates instantly as the user toggles presets, sections, header info, font, orientation, and date/course scope.

## Approach

The existing print pipeline (`renderCoverPage`, `renderPlanHTML`, `PLAN_PRINT_STYLES`) already produces a complete HTML document string. We can reuse it verbatim by piping its output into a sandboxed `<iframe srcDoc=…>` embedded in the dialog. No changes to the print logic itself — same code path drives the preview and the actual print window.

## Changes

### 1. Widen the Export dialog into a two-pane layout
`src/components/planbook/ExportDialog.tsx`
- Bump `DialogContent` max width from `max-w-2xl` to `max-w-6xl` (with `max-h-[92vh]`).
- Replace the single-column body with a responsive grid:
  - **Left pane** (`lg:col-span-5`): existing Tabs (Preset / Scope / Sections / Header / Layout), kept scrollable.
  - **Right pane** (`lg:col-span-7`): new `PrintPreview` component, sticky, fills available height.
- On screens narrower than `lg`, stack the preview below the controls and cap its height (e.g. `h-[420px]`).

### 2. Extract the document-building logic so preview and print share it
`src/components/planbook/ExportDialog.tsx`
- Refactor the body of `exportNow` into a pure helper `buildExportDoc(profile, from, to, pickedCourses, state)` that returns `{ title, bodyHTML, primaryHex, runningHeaderText }`.
- `exportNow` calls this helper and forwards to `openPrintWindow`.
- The preview component calls the same helper, then assembles the full HTML doc (the same `<!doctype>…<style>…</style>…<body>…</body>` string currently built inside `openPrintWindow`).

### 3. Expose the doc-string builder from printPlan
`src/lib/planbook/printPlan.ts`
- Add a small `buildPrintDocument(opts: OpenPrintOptions): string` that returns the full HTML string currently inlined in `openPrintWindow`.
- Refactor `openPrintWindow` to call `buildPrintDocument` and `w.document.write(...)` — no behavior change.
- This way the preview iframe and the print window are guaranteed to render identically.

### 4. New `PrintPreview` component
`src/components/planbook/PrintPreview.tsx` (new)
- Props: `{ docHTML: string; orientation: "portrait" | "landscape" }`.
- Renders a "page" frame (drop shadow, off-white background to mimic paper on a desk) wrapping an `<iframe sandbox srcDoc={docHTML} title="Print preview">`.
- Iframe size derived from orientation: portrait ~ 8.5×11 aspect, landscape ~ 11×8.5; scales to fit the right pane width using `transform: scale(...)` so the user sees a true-to-scale page.
- Add page-count footer (e.g. "Page 1 of N", computed by counting `.page-break` occurrences + cover page) and an orientation badge.
- Debounce updates (~150 ms) so rapid typing in header inputs doesn't thrash the iframe.

### 5. Wire the preview in
`ExportDialog.tsx`
- `useMemo` over `(profile, from, to, pickedCourses, state.instances, state.tags, state.courses, state.overrides)` to recompute `docHTML` via `buildExportDoc` + `buildPrintDocument`.
- Pass to `<PrintPreview docHTML={docHTML} orientation={profile.orientation} />`.
- Guard against very long date ranges by capping the preview to the first ~10 day-pages with a "+N more pages will be printed" note; the actual print still includes everything.

## Technical notes

- **Sandboxing**: iframe uses `sandbox="allow-same-origin"` (no scripts needed — pure HTML/CSS render).
- **Fonts**: the preview iframe contains the same Google Fonts `<link>` as the print window, so heading/body fonts match exactly.
- **Performance**: building the HTML string is cheap (already done synchronously today). Debouncing only the iframe `srcDoc` update keeps typing smooth.
- **Print pagination caveat**: `@page` CSS only affects actual printing; the preview won't paginate into separate sheets. That's acceptable — we still show a single continuous paper-styled scroll and indicate page breaks visually using horizontal rule + "Page N" markers inserted around `.page-break` divs in the preview only.
- **No business-logic changes**: only presentation and a thin refactor of `openPrintWindow` to share the doc-string builder.

## Files touched

- `src/components/planbook/ExportDialog.tsx` — two-pane layout, helper extraction, preview wiring
- `src/components/planbook/PrintPreview.tsx` — new
- `src/lib/planbook/printPlan.ts` — extract `buildPrintDocument`, no behavior change
