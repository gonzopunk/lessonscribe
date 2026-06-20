Make the tiny Weekly Agenda preview thumbnail in Settings clickable so it opens a modal with a large, readable version of the same image.

**What changes**

1. In `src/components/planbook/WorksheetTemplateSettings.tsx`:
   - Add local state `previewOpen` to control modal visibility.
   - Wrap the existing `<img>` (lines 160-164) in a button or add `cursor-pointer` so it looks and behaves clickable. Add an `onClick` that opens the modal.
   - Render a `<Dialog>` (from `@/components/ui/dialog`) when `previewOpen` is true.
   - The dialog shows the same `/presets/weekly-agenda-preview.png` image at a much larger size (e.g., `max-w-3xl w-full` or similar) so the worksheet text is readable.
   - Include a close button in the dialog header and support closing via Escape / click outside.

**What does not change**
- The original thumbnail size and layout stay the same.
- No changes to worksheet generation, presets, store, or other settings.
- The image asset itself (`/presets/weekly-agenda-preview.png`) is not modified.

**Technical details**
- Use the existing shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, and `DialogClose` components already available in the project.
- Keep the modal header minimal: title like "Weekly Agenda preview" and a close button.
- Use `object-contain` on the large image so it scales cleanly without cropping.