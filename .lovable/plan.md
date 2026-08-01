# Rebuild onboarding: multiple courses, two steps, no personal data

## What changes

Onboarding becomes a two-step flow. Step 1 asks for the school year (with dates that are correct no matter what month you sign up). Step 2 lets you add up to 6 courses, each with its own name, color, number of sections, and class period length. All of one teacher's leftover sample data — the "10th Grade ELA" name, the three hardcoded period names, and the red-folder/bathroom/blue-binder sub plan text — is removed.

## Step 1 — Your school year

- Title: `Welcome to {APP_NAME}`; description: "First, when does your school year run? You can change any of this later in Settings."
- Start date, end date side by side, plus the optional District iCal URL field.
- Defaults computed from the current month: start year is the current year when the month is July or later, otherwise the previous year. Start `{startYear}-08-15`, end `{startYear+1}-06-15`.
- Footer: single "Next" button, disabled when either date is empty.

## Step 2 — Your courses

- Title: "Your courses"; description: "Add a course for each class you plan separately. Most teachers start with one or two."
- Each course renders as a card (`rounded-xl border border-border bg-card p-4`, stacked `space-y-3`) with a two-column grid on `sm` and up:
  - Course name (required, placeholder "e.g. English 9")
  - Color via the existing ColorPicker
  - Number of sections (1–10), helper: "Sections share one lesson plan, with optional per-section notes."
  - Class period length in minutes (min 1, default 50), helper: "If some days are shorter, you can set each day individually in Settings."
- Remove button (ghost icon, Trash2, destructive, aria-label "Remove course") in the card's top right, only when more than one course exists.
- "Add another course" outline button with a Plus icon below the cards; disabled at 6 courses with muted text "Maximum of 6 courses".
- Footer: "Back" (ghost) and "Start planning", the latter disabled when any course name is blank after trimming.
- A muted "Step 1 of 2" / "Step 2 of 2" indicator sits with the footer.

## Submit

Each course entry maps to: trimmed name, color, `sections` of length sectionCount named `Period 1..n`, `dayMinutes` with the same minutes for mon–fri, and `subDefaults: ""`.

## Technical notes

`src/lib/planbook/store.ts` — `completeOnboarding` takes `courses: Omit<Course, "id" | "createdAt">[]` instead of a single `course`, in both the Actions interface and the implementation. It returns early without state changes on an empty array, generates a `nanoid(8)` id and `createdAt` per course, flatMaps the four default tags (Bellringer/amber, Direct Instruction/indigo, Discussion/teal, Assessment/rose) across every course scoped to that course's id, and sets `activeCourseId` to the first course. `onboarded`, `presetOfferPending`, and the settings updates (schoolYearStart, schoolYearEnd, icalFeeds) are untouched.

`src/components/planbook/OnboardingDialog.tsx` — keeps the Dialog shell, `max-w-2xl max-h-[90vh] overflow-y-auto`, and onDismiss behavior. State becomes `step`, `start`, `end`, `ical`, and `courses: { key; name; color; sectionCount; minutes }[]` seeded with one entry. The `s1/s2/s3` and `subs` state is deleted. All generated ids use `nanoid` from the `nanoid` package, not `crypto.randomUUID()`.

Not touched: PresetOfferDialog, the post-onboarding preset offer flow, and Settings.
