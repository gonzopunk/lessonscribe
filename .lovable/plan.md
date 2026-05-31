# Add three optional day-level note fields (Tweak 2)

Self-contained addition. Three new `DayMeta` fields surface in the lesson plan modal, the export dialog, the print renderer, and the worksheet field-source picker.

## 1. Types — `src/lib/planbook/types.ts`

Append to `DayMeta` (after `reflection`):

```ts
differentiationNotes: string;
behaviorNotes: string;
materialsNotes: string;
```

Append to the `FieldSource` union (after `day-objectives`):

```ts
| { type: "day-differentiation"; dayOffset: DayOffset }
| { type: "day-behavior";        dayOffset: DayOffset }
| { type: "day-materials";       dayOffset: DayOffset }
```

## 2. Store — `src/lib/planbook/store.ts`

Extend `blankDayMeta()` with the three new fields (empty strings). No other store changes — `updateDayMeta` already takes `Partial<DayMeta>`, and `getDayMeta` will merge legacy records against the new blank so stored records without these fields read as `""`.

## 3. Export presets — `src/lib/planbook/exportPresets.ts`

Add to `ExportSectionFlags` (after `reflection`): `differentiation`, `behaviorNotes`, `materials`.

`baseSections` defaults:
- `differentiation: false`
- `behaviorNotes: false`
- `materials: true`

Override per preset:
- teacher: `differentiation: true, behaviorNotes: false, materials: true`
- sub:     `differentiation: true, behaviorNotes: false, materials: true`
- admin:   `differentiation: false, behaviorNotes: false, materials: false`
- formal:  `differentiation: true, behaviorNotes: false, materials: true`

## 4. Print renderer — `src/lib/planbook/printPlan.ts`

Extend `ALL_SECTIONS` with `differentiation: true, behaviorNotes: false, materials: true` so explicit overrides aren't lost.

In `renderPlanHTML`, all reads use `meta.<field> ?? ""` (DayMeta records from older localStorage may lack these fields even though the type now declares them).

Lesson plan mode:
- After standards block → render Differentiation, then Materials (each guarded `sections.<flag> && (value || !compact)`).
- After reflection block → render Behavior Notes (same guard).

Sub plan mode:
- After day notes block → render Differentiation, then Materials.
- Do not render Behavior Notes in sub mode.

Section titles: `Differentiation / 504 & IEP`, `Materials`, `Behavior Notes`. Empty value renders `—`.

## 5. Worksheet resolver — `src/lib/planbook/worksheetResolver.ts`

Add three cases mirroring `day-notes` / `day-objectives`, each reading `state.dayMeta[metaKey(courseId, dKey)]?.<field> ?? ""`.

## 6. Plan modal — `src/components/planbook/PlanModal.tsx`

Lesson plan mode only. Insert a new collapsible section between the Day notes / Section notes block and the Reflection section.

- Local `useState<boolean>` for expanded state (default collapsed).
- Collapsed: a single button row showing a ChevronDown / ChevronRight icon + label "Differentiation, behavior & materials".
  - If any of the three fields has a non-empty value, swap the label color to `text-foreground` and show a small filled dot (`size-1.5 rounded-full bg-primary`) before the label. Otherwise `text-muted-foreground`.
- Expanded: three `Textarea rows={3}` blocks with labels/placeholders exactly as specified, each calling `updateDayMeta(course.id, dayKey, { <field>: e.target.value })`. Read values as `meta.<field> ?? ""`.

No save button — follows existing autosave pattern.

## 7. Export dialog — `src/components/planbook/ExportDialog.tsx`

Extend `SECTION_GROUPS` with three new entries so they appear in the existing sections list:
- `{ key: "differentiation", label: "Differentiation / 504 & IEP", group: "both" }`
- `{ key: "behaviorNotes",   label: "Behavior notes",              group: "lesson" }`
- `{ key: "materials",       label: "Materials needed",            group: "both" }`

This reuses the existing `visibleSectionKeys` filter and `setSection` handler — no new UI primitives needed. Initial state already flows from the active profile.

## 8. Worksheet template settings — `src/components/planbook/WorksheetTemplateSettings.tsx`

Extend `defaultSourceForKind` switch with the three new kinds (each `{ type, dayOffset: 0 }`).

Extend `sourceLabels` in `SourceEditor` with:
- `"day-differentiation": "Day differentiation"`
- `"day-behavior": "Day behavior notes"`
- `"day-materials": "Day materials"`

Extend the `hasDay` boolean to include the three new types so the day-picker row renders.

## Notes

- All reads use `meta.<field> ?? ""` because pre-existing stored DayMeta records do not have the new keys.
- No changes to routes, cloud sync (DayMeta is already in the cloud shape), or any component not listed above.
