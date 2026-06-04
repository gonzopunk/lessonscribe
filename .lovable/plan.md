No changes. Per your choice (option a), we're leaving the previous fixes in place:

- Debounce hook on `InstanceCard`, `PlanModal`, `WeekNotesDialog` inputs (300ms).
- Worksheet PDF/DOCX blobs moved out of localStorage into IndexedDB via `worksheetBlobs.ts`, with `partialize` stripping them from the persisted Zustand state.

Both materially help real users (typing outside the preview frame, and anyone with worksheet templates uploaded). The residual lag you're seeing only inside the Lovable preview iframe is environmental instrumentation overhead, not an app bug — verified by the fact that the same build runs smoothly when opened in a new tab.

**How to test typing performance going forward:** use "Open in new tab" from the preview, or the published URL. Treat the in-frame editor as a layout/visual preview, not a performance preview.

Nothing to implement.