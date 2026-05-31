# Worksheet Generator

Self-contained addition to LessonCraft. No existing behavior changes.

## Pre-flight additions

- **removeCourse cascade**: In `src/lib/planbook/store.ts`, extend `removeCourse` so it also drops the deleted course's worksheet templates:
  `worksheetTemplates: s.worksheetTemplates.filter(t => t.courseId !== id)`
  This keeps cleanup symmetric with tags/templates/instances and prevents orphaned PDF blobs.
- **Editor-scoped preview**: In `WorksheetTemplateSettings`, the live preview column in the field-mapping table must resolve values against the `courseId` currently selected in the editor form — not against `activeCourseId` from the store. The preview week comes from `state.anchorDate`.

## Implementation steps

1. `bun add pdf-lib`.
2. Add `DayOffset`, `FieldSource`, `FieldMapping`, `WorksheetTemplate` types and `worksheetTemplates` on `PlanBookState` in `types.ts`.
3. Update `store.ts`: initial state, persist merge, three actions (`addWorksheetTemplate`, `updateWorksheetTemplate`, `removeWorksheetTemplate`), and the `removeCourse` cascade.
4. Add `worksheetResolver.ts` with `resolveFieldValue(source, courseId, weekMonday, state)`.
5. Add `worksheetGenerator.ts` with `fillWorksheetPdf` + `triggerPdfDownload`.
6. Add `WorksheetTemplateSettings.tsx` (per-course template manager, PDF AcroForm parse, field-mapping editor, editor-scoped preview).
7. Add `WorksheetGenerateDialog.tsx` (template select, preview table with overflow warnings, Editable/Print-ready toggle, download).
8. Patch `PlannerWorkspace.tsx`: hover-revealed "Generate worksheet" button in each week header (when course has templates), and mount the dialog.
9. Patch `routes/settings.tsx`: render `<WorksheetTemplateSettings />` after Category tags.

## Notes
- pdf-lib runs entirely client-side; no server route, no worker mode.
- Every `PDFDocument.load` is wrapped in try/catch with `toast.error`.
- `characterBudget` is advisory only — UI warnings, no generation effect.
- Base64 storage of typical worksheet PDFs (~100–400 KB) is acceptable in the existing zustand-persist localStorage model.
