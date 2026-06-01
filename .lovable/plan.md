## Add DOCX template support to the worksheet generator

Add a parallel Word-document path alongside the existing PDF/AcroForm flow. Existing PDF templates keep working unchanged via a migration that stamps `type: "pdf-fill"`.

### 1. Dependencies
- `bun add docxtemplater pizzip`

### 2. Types (`src/lib/planbook/types.ts`)
- `WorksheetTemplate`: add `type: "pdf-fill" | "docx-fill"`, make `pdfBase64` optional, add optional `docxBase64`, `loopFields`.
- `FieldSource` `element-titles` variant: add optional `asArray?: boolean`.

### 3. Store (`src/lib/planbook/store.ts`)
- In merge, map `worksheetTemplates` to default `type: "pdf-fill"` for legacy records.

### 4. Resolver (`src/lib/planbook/worksheetResolver.ts`)
- Add `resolveFieldValueForDocx` that returns `string[]` for `element-titles` with `asArray`, otherwise delegates to `resolveFieldValue`.

### 5. Generator (`src/lib/planbook/worksheetGenerator.ts`)
- Static imports for `Docxtemplater`, `PizZip`, `resolveFieldValueForDocx`, `PlanBookState`.
- Add `fillDocxTemplate(template, courseId, weekMonday, state)` using `{{ }}` delimiters, `paragraphLoop: true`, `linebreaks: true`.
- Add `triggerDocxDownload`.
- Tighten `fillWorksheetPdf` to use `template.pdfBase64!`.

### 6. Template Settings UI (`src/components/planbook/WorksheetTemplateSettings.tsx`)
- Split "Add template" into "Add PDF template" and "Add Word template"; `startNew(type)` seeds `type`, and `loopFields: []` when docx.
- Add `onDocxFile`: dynamic `import("pizzip")`, read `word/document.xml`, strip XML tags, regex-detect `{{field}}` and `{{#field}}`; default loop fields to `element-titles` + `asArray: true`, others to `static`.
- Render PDF upload UI for `pdf-fill`, DOCX upload UI for `docx-fill` (drop zone, detected fields summary, loop-field callout).
- `SourceEditor`: add "As list (for loop syntax)" checkbox after the separator input for `element-titles`.
- Bug fix: extend week-custom Select to include custom3–custom5.
- Update list-view description to mention both PDF AcroForm and `{{field_name}}` Word templates.

### 7. Generate Dialog (`src/components/planbook/WorksheetGenerateDialog.tsx`)
- Import `fillDocxTemplate`, `triggerDocxDownload`.
- `onGenerate` branches on `template.type`: docx path generates `.docx` from full state; pdf path unchanged.
- Hide Output mode toggle when `template.type === "docx-fill"`.
- Button label: "Generate .docx" vs "Generate PDF".

### Notes
- Dynamic `import("pizzip")` in the settings upload handler keeps initial bundle lean; static import in the generator is fine since it's only loaded at generation time.
- No route, calendar, planner, or lesson-plan-modal changes.
- Migration only adds `type` to existing template records — `pdfBase64`/`fieldMappings` preserved.
