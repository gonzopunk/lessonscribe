## What we know

- In the Generate Worksheet dialog, the Field / Value table shows the correct Weekly Objective text for the field.
- That same field is missing in the DOCX preview overlay.
- The mapping source is "Weekly objectives", which `resolveFieldValueForDocx` handles via `state.weekMeta[weekMetaKey(courseId, dayKey(weekMonday))].weeklyObjectives` — and it's clearly returning the right string, since the dialog table renders it.

So data resolution is fine. The value is being handed to `docxtemplater` in `fillDocxTemplate` (worksheetGenerator.ts) keyed on `mapping.fieldName`, but the rendered .docx does not show it. That isolates the problem to one of:

1. **Placeholder name mismatch** between `mapping.fieldName` and the `{{...}}` tag actually typed in the .docx file (docxtemplater tag names are case-sensitive — `{{WeeklyObjective}}` ≠ `weeklyObjective`).
2. **Split-run placeholder in the .docx** — when the user typed `{{WeeklyObjective}}` in Word and any character inside it has different formatting (bold/italic/color/spellcheck mark), Word splits the placeholder across multiple `<w:r>` runs in the underlying XML. Docxtemplater then fails to recognize the tag and silently leaves it (or the surrounding paragraph) untouched. This is the single most common cause of "one field doesn't render but the others do."
3. **Silent docxtemplater error** — we currently call `doc.render(data)` with no `errorLogging` and no try/catch around it, so any per-tag error is swallowed.

## Plan

### Step 1 — surface the real error

In `src/lib/planbook/worksheetGenerator.ts`, wrap `doc.render(data)` in a try/catch. On failure, walk `error.properties.errors` (docxtemplater's standard shape) and `console.warn` each one with `tag`, `id`, `explanation`, then re-throw a single human-readable error that bubbles into the existing `toast.error` in `WorksheetGenerateDialog.onPreview`. This alone tells us in one click whether it's a split-run tag, an unknown tag, or a name mismatch.

### Step 2 — auto-heal split-run placeholders

Add a small pre-processing step in `fillDocxTemplate` before constructing the `Docxtemplater`:

- Read `word/document.xml` (and any header/footer parts that contain placeholders) from the PizZip instance.
- For each paragraph, detect any `{{...}}` that spans multiple `<w:r>` runs and collapse the runs that make up the tag into a single run, preserving the formatting of the first run in the span.
- Write the cleaned XML back into the zip before `new Docxtemplater(zip, ...)`.

This is the canonical fix for the "one placeholder mysteriously doesn't fill" symptom and is safe for the other fields (they're already in single runs, so the pre-processor is a no-op for them).

### Step 3 — verify against the user's actual template

After Steps 1–2 ship, the user re-runs Preview:

- If Weekly Objective now appears → done, split-run was the cause.
- If Step 1's toast/console shows `unknown tag` or a name like `WeeklyObjective` vs mapping `weeklyObjective` → it's a name-mismatch issue and the fix is to either rename the placeholder in the .docx or rename the mapping in Settings → Worksheet Templates. We'll surface this guidance in the toast message.

### Step 4 — small UX touch (optional, only if Step 3 shows a name mismatch)

In `WorksheetTemplateSettings`, when a field name in the mapping list does not appear as a `{{...}}` placeholder anywhere in the uploaded .docx, show an inline warning chip on that row (we already parse the .docx on upload — same parser can return the placeholder set). This prevents the same class of bug from recurring with future templates.

## Technical notes

- Files touched: `src/lib/planbook/worksheetGenerator.ts` (Steps 1 + 2), optionally `src/components/planbook/WorksheetTemplateSettings.tsx` (Step 4). No DB, no schema, no auth changes.
- Docxtemplater error shape: `error.properties.errors[].properties.{ id, explanation, xtag, offset }`.
- The split-run repair only needs to operate on text inside `<w:p>` → `<w:r>` → `<w:t>` chains; we don't need a full XML parser, a scoped regex pass per paragraph is sufficient and is the standard approach docxtemplater itself recommends.
- No changes to the PDF path, the data resolver, the weekly notes dialog, or cloud sync.

