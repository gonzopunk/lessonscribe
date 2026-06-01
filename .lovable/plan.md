## Add DOCX preview step to worksheet generator

Adds a full-screen preview overlay for DOCX templates only. PDF path is untouched.

### 1. Dependency
- `bun add docx-preview`

### 2. New component — `src/components/planbook/WorksheetPreviewModal.tsx`
Fixed `inset-0 z-50` overlay rendering a filled DOCX via `docx-preview`'s `renderAsync`.
- Props: `open`, `onClose`, `bytes: Uint8Array | null`, `filename`.
- Effect: on open + bytes, clear container `innerHTML`, call `renderAsync(bytes.buffer, container, undefined, { className: "docx-preview", breakPages: true, inWrapper: true, ignoreWidth: false, ignoreHeight: false })`, toggle `rendering` flag.
- Top bar: Back button (calls `onClose`), filename label, Print button, Download .docx button (uses existing `triggerDocxDownload`).
- Print: opens new window, writes minimal print stylesheet + `containerRef.innerHTML`, calls `window.print()` after 600ms.
- Loading state shows a `Loader2` spinner while `rendering` is true.

### 3. `src/components/planbook/WorksheetGenerateDialog.tsx`
- New imports: `fillDocxTemplate` already imported; add `WorksheetPreviewModal`.
- New state: `previewOpen: boolean`, `previewBytes: Uint8Array | null`.
- New `onPreview` handler for DOCX: calls `fillDocxTemplate(template, courseId, weekMonday, fullState)`, stores bytes, opens preview; toast on error; toggles `generating`.
- Button: when `template?.type === "docx-fill"`, render "Preview document" calling `onPreview`; otherwise keep existing "Generate PDF" calling `onGenerate`.
- Output mode toggle already conditional on `template.type === "pdf-fill"` — keep as is (equivalent to spec's wrap).
- Render `<WorksheetPreviewModal>` outside the `<Dialog>` (inside a fragment wrapper at the top of return) so the generate Dialog stays mounted and state is preserved when user clicks Back.

### Notes
- `bytes.buffer as ArrayBuffer` for `renderAsync` input.
- Generate Dialog is not unmounted while preview is open; Back returns user exactly where they left off.
- No changes to PDF path, template settings UI, planner workspace, resolver, or generator.
