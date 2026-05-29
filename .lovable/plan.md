## PlanBook — Build Plan

A calm, dyslexia-friendly lesson planner. Local-first storage, layered rollout, design directions before code.

---

### Phase 0 — Design directions (first step in build mode)

Before writing app code, generate 3 rendered design directions for the core **3-week planner view** (header with course switcher + view selector, weeks-as-columns grid, day cells with element cards + minutes bar + status pill, collapsible element bank panel, Wednesday treatment). Constraints locked across all three:

- Soft warm off-white (not pure white) light theme + true dark theme
- Strong color coding (course color, category color, status color)
- Clear hover/focus affordances, restrained motion
- Optional dyslexia-friendly font slot

You'll pick one; I'll port its tokens and composition verbatim into the React app.

---

### Phase 1 — Core planner (v1)

**Data & persistence**
- Zustand store, persisted to `localStorage` under a single namespaced key, with a versioned schema and a thin repository layer so a Cloud/DB swap later is a one-file change.
- Entities: `Course`, `Section`, `CategoryTag`, `ElementTemplate` (per course), `ElementInstance`, `DayRecord` (keyed by courseId + ISO date), `CalendarOverride`, `AppSettings`.

**First-run setup**
- Modal wizard: school year start/end, create first course (name, color, 3 section names, M/T/R/F period mins, Wednesday mins), optional iCal URL (can skip).

**3-week planner view (default)**
- Top bar: course switcher (tabs), view selector (1/2/3/4-week, month), filter bar (category multi-select with dim/hide toggle), settings gear.
- Grid: weeks as columns, M–F as rows. Wednesday column tinted + labeled.
- Day cell: date, status pill (Draft/Ready/Taught, click to cycle), stacked element instance cards (color = category), minutes bar (used / total, red on overrun), expand/collapse toggle, hover reveals "Lesson Plan" + "Sub Plan" buttons (stubs in v1, wired in v2).
- No-school days greyed out, no slots.
- Multi-select day cells (click + shift-click range).

**Element bank**
- Collapsible right panel. Cards grouped by category tag. Tag filter chips. Search.
- Element template fields: title, category tags, default duration, notes, link(s), color.

**Drag-and-drop (dnd-kit)**
- Bank card → day cell creates an instance (template untouched).
- Reorder within a day.
- Move between days.
- Batch assign: with N day cells selected, clicking a bank card assigns to all.
- Instance quick-edit: click instance content field → inline popover (instance content text, duration override, instance notes).

**Settings panel**
- Courses (CRUD, color, section names, period lengths, sub-plan defaults).
- Category tags (CRUD, color).
- Calendar (school year, iCal URL field, manual "Re-sync" button — wired in v1 if iCal proxy lands, else disabled).
- Appearance: light/dark, theme preset, accent color, font (system / dyslexia-friendly), font size S/M/L, density comfortable/compact, reduce motion.

**Calendar overrides**
- Click any day → override dialog: no school / assembly / testing / custom label + note. Persists; overrides iCal.

---

### Phase 2 — Lesson & Sub plans + export

- Lesson Plan modal: course, date, period length, objectives, standards, element-by-element breakdown (auto from instances), day notes, post-lesson reflection. Expanded/Compact toggle. In-place editing. Export PDF + Print.
- Sub Plan modal: pre-filled from lesson + per-course sub defaults (class management, seating, bathroom policy). Student-facing step-by-step. Editable. Export PDF + Print (prominent).
- PDF via `@react-pdf/renderer` (reliable, Worker-incompatible libs avoided in client).
- Duplicate Day / Copy Week actions on cell overflow menu.

---

### Phase 3 — Month calendar + iCal import

- Month calendar view with course multi-select; each course shown as a color band per day. Range-based PDF/print export.
- iCal import: Lovable Cloud server route `/api/ical-proxy` fetches the user's URL server-side (avoids CORS), returns ics text. Client parses with `ical.js`, writes non-school days into `CalendarOverride` (source=ical, user overrides win). Manual re-sync button triggers refetch.

---

### Technical notes

- React + TanStack Start (existing template), Tailwind, shadcn/ui, dnd-kit, zustand, ical.js, @react-pdf/renderer, date-fns.
- Semantic tokens only — all course/category/status colors flow through CSS variables defined in `src/styles.css` so theme switching is one place.
- Routes: `/` (planner), `/calendar` (month view, phase 3), `/settings`. Lesson/Sub plans are modals, not routes.
- Storage abstraction: `src/lib/storage/` with `LocalStorageRepo` implementing a `Repo` interface. Future Cloud swap = new implementation.
- Tablet 1024px minimum; planner grid collapses gracefully (bank panel becomes bottom sheet).
- "Renamable app": single `APP_NAME` constant + favicon/manifest entries — rename in one file.

---

### Out of scope for v1 (explicit)

- Auth, multi-user, sync across devices (localStorage only per your choice).
- Cross-course element sharing.
- Mobile phone layouts (<1024px).

After you approve, I'll switch to build mode and start with the design directions step.