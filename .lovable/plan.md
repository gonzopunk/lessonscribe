# Weekly Agenda with Word of the Day — built-in preset

Scope: 2 new files, 4 file edits, 1 dependency install.

## 1. Install dependency
- `bun add @react-pdf/renderer` (not currently in package.json).

## 2. `src/lib/planbook/types.ts` (edit)
- Extend `WorksheetTemplate.type` union to `"pdf-fill" | "docx-fill" | "preset"`.
- Add optional `presetId?: string` on `WorksheetTemplate`.

## 3. `src/lib/planbook/presets.ts` (new)
- Export `seedWeeklyAgendaPreset(courseId: string): void`.
- Pull store via `usePlanBook.getState()`, then:
  - A. `addTag` three times → capture `wordTagId`, `activityTagId`, `exitTagId` (violet/blue/green).
  - B. `addTemplate` twice → "Word of the Day" and "Exit Ticket" with the specified tagIds, color, defaults, notes.
  - C. `updateCourse(courseId, { weekMetaLabel1..5 })` with the five labels.
  - D. `addWorksheetTemplate` with `type: "preset"`, `presetId: "weekly-agenda-word-of-day"`, `hasFile: false`, empty `detectedFields`/`loopFields`, and the full `fieldMappings` list (week_header, weekly_objective, tip_week, reflection_1..3, plus per-day date/word/activities/exit for Mon–Fri using the captured tag IDs and the exact `FieldSource` shapes from the spec).

## 4. `src/components/planbook/presets/WeeklyAgendaPreset.tsx` (new)
- React component using `@react-pdf/renderer` primitives only (`Document`, `Page`, `View`, `Text`, `StyleSheet`).
- Props: `{ weekMonday: Date; fields: Record<string, string> }`.
- Compute date range with date-fns: `format(weekMonday, "MMM d") + " – " + format(addDays(weekMonday, 4), "MMM d, yyyy")`.
- Page 1 (Letter portrait, 36pt padding, black on white, `#e5e7eb` rules):
  - Header: large bold `week_header || "Weekly Agenda"`, small gray date range, `Objective: …`, hr.
  - Mon–Fri sections (loop over the 5 day suffixes) — gray-bg day header (bold `date_*`), `Word of the Day:` + bold word, italic gray "7-min Quick Write", activities split on `\n` filtered, rendered as `□ <item>` (or `—` if empty), `Exit Ticket: …`, divider.
  - Footer: `Tip of the Week: …` and three `Reflection N: …` lines (or `—`).
- Page 2 (Letter portrait, 36pt padding):
  - Bold date range header, thin rule, `Name: ___   Date: ___`, then 18 evenly spaced thin full-width gray lines for student notes.

## 5. `src/components/planbook/OnboardingDialog.tsx` (edit)
- Add `const [step, setStep] = useState<"course" | "preset">("course")`.
- "Start planning" onClick: call existing `completeOnboarding(...)`, then `setStep("preset")` (don't dismiss).
- Gate `Dialog onOpenChange`: when `step === "preset"`, ignore close attempts (X disabled) — user must click one of the two buttons.
- When `step === "preset"`, replace body with:
  - Title "Your worksheet is ready to set up"
  - Description as specified.
  - Bullet list: three lesson tags / two element templates / one pre-mapped worksheet template.
  - Footer:
    - Primary "Set it up" → `seedWeeklyAgendaPreset(usePlanBook.getState().activeCourseId!)` then `onDismiss?.()`.
    - Outline "Skip for now" → `onDismiss?.()`.
- Import `seedWeeklyAgendaPreset` from `@/lib/planbook/presets`.

## 6. `src/components/planbook/WorksheetGenerateDialog.tsx` (edit)
- Hide the editable/print-ready output-mode toggle when `template?.type === "preset"` (extend the existing `(!template || template.type === "pdf-fill")` guard).
- Action button:
  - `preset` → render "Download PDF" button calling `onGeneratePreset`.
  - existing `docx-fill` → Preview, `pdf-fill` → Generate (unchanged).
- Add `onGeneratePreset`:
  - Build `resolvedFields` from `rows` (`fieldName → value`).
  - Dynamic import `{ pdf }` from `@react-pdf/renderer` and `WeeklyAgendaPreset`.
  - `const blob = await pdf(<WeeklyAgendaPreset weekMonday={weekMonday} fields={resolvedFields} />).toBlob()`.
  - Trigger download via temp `<a>`, filename `${courseSanitized}-agenda-${format(weekMonday,"yyyy-MM-dd")}.pdf`, revoke URL.
  - `toast.success("Worksheet downloaded")`, `onOpenChange(false)`; errors → `toast.error`; wrap in `setGenerating(true/false)`.

## 7. `src/lib/planbook/store.ts` — persist merge (edit)
In the `migratedTemplates.map` (around lines 558–569), replace the returned object's `type` handling so preset/docx survive hydration:

```ts
return {
  ...rest,
  type: ((rest.type as string) === "preset" ? "preset"
       : (rest.type as string) === "docx-fill" ? "docx-fill"
       : "pdf-fill") as WorksheetTemplate["type"],
  hasFile: hasBlob || !!rest.hasFile,
};
```

No other code paths change.

## Technical notes
- `@react-pdf/renderer` runs client-side only; dynamic import in the generate dialog keeps it out of the SSR/loader path.
- The preset PDF intentionally uses only built-in fonts/colors — no font registration or assets needed.
- `activeCourseId` is set by `completeOnboarding`, so it's safe to non-null assert when "Set it up" is clicked after step transition.
