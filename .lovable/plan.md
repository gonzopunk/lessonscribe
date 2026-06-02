## Diagnosis

The generated DOCX is correct: after downloading and opening in Word, the Weekly Objective appears.

The missing field only happens in the in-app preview because the placeholder sits inside a Word text box / header / footer / callout area. `docx-preview` does not fully support all Word drawing/textbox layouts, so it can render the rest of the document while dropping or mis-rendering that area.

## Plan

### 1. Stop treating this as a data/mapping problem

Remove or narrow the temporary worksheet warnings that report mappings like `activities_mon` not found. Those are false positives for loop section tags like `{{#activities_mon}}...{{/activities_mon}}` and are creating noise.

### 2. Change the DOCX preview strategy

For DOCX templates, generate the filled `.docx` exactly as we do now, but preview it using a browser-native document frame instead of `docx-preview` when the document contains Word drawing/textbox/callout markup.

Implementation:

- Add a lightweight detector in `worksheetGenerator.ts` / preview flow for Word text box/drawing markup such as `w:txbxContent`, `wps:txbx`, `v:textbox`, or `word/header*.xml`/`word/footer*.xml` parts containing placeholders.
- Pass a preview mode flag into `WorksheetPreviewModal`.
- If the filled DOCX contains those structures, show a full-screen fallback preview state:
  - clear message that the file is generated correctly but this template uses Word layout features that cannot be rendered faithfully in-browser
  - primary actions: Download DOCX, Print after opening in Word/Google Docs, Back to settings
  - no misleading rendered preview that omits fields
- If the document does not contain those structures, continue using `docx-preview` as today.

### 3. Keep downloads and Word output unchanged

No changes to `fillDocxTemplate` data resolution or DOCX generation. The generated file already contains Weekly Objective correctly.

### 4. Optional guardrail in Settings

In Worksheet Template Settings, when an uploaded DOCX contains Word text boxes/callouts, show a small warning near the template upload/mapping area:

> This template uses Word text boxes/callouts. Downloads will work, but in-app preview may not exactly match Word.

This prevents future confusion without blocking the template.

## Files to update

- `src/lib/planbook/worksheetGenerator.ts`
- `src/components/planbook/WorksheetGenerateDialog.tsx`
- `src/components/planbook/WorksheetPreviewModal.tsx`
- optionally `src/components/planbook/WorksheetTemplateSettings.tsx` for the settings warning

## Expected result

The preview flow will no longer show a misleading blank Weekly Objective. For templates using Word text boxes/callouts, the app will tell the user the DOCX is generated correctly and direct them to download/open it for faithful viewing/printing. Normal DOCX templates continue to render in the in-app preview overlay.