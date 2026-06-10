# Wire Weekly Agenda preset to bundled DOCX

Route the Weekly Agenda preset through the existing docxtemplater pipeline using a static DOCX bundled at `/presets/weekly-agenda-ela.docx`, and seed three additional daily-routine element templates. The react-pdf path stays intact for future pure-PDF presets.

## Changes

### 1. `src/lib/planbook/types.ts`
Add `bundledTemplateUrl?: string` to `WorksheetTemplate`, immediately after `hasFile`.

### 2. `src/lib/planbook/worksheetGenerator.ts`
Update `getTemplateDocxBase64` to fetch and base64-encode the file when `template.bundledTemplateUrl` is set, before falling back to the existing `docxBase64` / IndexedDB blob lookups.

### 3. `src/lib/planbook/presets.ts`
Inside `seedWeeklyAgendaPreset`:
- **3A**: Add three new `addTemplate` calls (all tagged `activityTagId`): "7-min Quick Write" (7 min), "Turn in Agenda and Word of the Day" (2 min), "Weekly Reflection" (10 min, notes "Place on Fridays only").
- **3B**: Add `asArray: true` to each `activities_${sfx}` field source so docxtemplater loops receive a string array.
- **3C**: On the `addWorksheetTemplate` call, set `bundledTemplateUrl: "/presets/weekly-agenda-ela.docx"` and `loopFields: ["activities_mon", "activities_tue", "activities_wed", "activities_thu", "activities_fri"]`.

### 4. `src/components/planbook/WorksheetGenerateDialog.tsx`
Update the bottom button block so:
- `preset` + no `bundledTemplateUrl` → Download PDF (`onGeneratePreset`)
- `docx-fill` OR `preset` + `bundledTemplateUrl` → Preview document (`onPreview`)
- otherwise → Generate PDF (`onGenerate`)

## Out of scope
No changes to `WeeklyAgendaPreset.tsx`, `worksheetResolver.ts`, `store.ts`, or settings UI.

## Manual follow-up (user)
After build, add `public/presets/weekly-agenda-ela.docx` to the repo and push. The preset will 404 until that file exists.
