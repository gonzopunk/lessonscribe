## Goal

Make the color system feel "real": every swatch shows a live preview of how it lands as a badge/pill, the preset palette is tightened and ordered for scanning, users can name favorite colors, and the chosen colors propagate consistently through tag pills, element/status badges, and the printed PDF.

## 1. Re-curate the palette (`src/lib/planbook/constants.ts`)

**12 presets, ordered by hue family for adjacency** (warm → neutral → cool → purple, with a mix of bright + muted in each family):

```text
Coral · Amber · Ochre  | Olive · Emerald · Teal | Sky · Indigo · Violet | Plum · Rose · Slate
```

Each preset keeps `{ id, label, hue }` but gains `chroma` and `lightness` so the table can mix vivid (e.g. Coral, Emerald, Sky) with muted (Ochre, Olive, Plum, Slate) instead of every preset sitting at the same 0.62/0.14 oklch values. `colorToken/Soft/Border` read the per-preset L/C.

**24 extended swatches**, re-ordered into 4 rows of 6 that mirror the same family order (warm vivid, warm muted, cool vivid, cool muted). Picked so brightness varies within each row.

Back-compat: any stored id not in the new 12 (e.g. old "fuchsia", "lime") falls through to a lookup map → nearest new preset, so existing courses/tags/elements keep rendering.

## 2. `ColorPicker` preview chips (`src/components/planbook/ColorPicker.tsx`)

Today each swatch is a flat circle. Replace with a small **PreviewChip** that shows, at swatch scale, the three surfaces the color actually appears on:

```text
┌──────────────┐
│ ● Tag pill   │   ← soft bg + border + dot, matches tag pill style
│ ▌ Element    │   ← left border + tinted bg, matches InstanceCard
└──────────────┘
```

- Inline row stays compact: hovering or focusing a swatch pops a small floating PreviewChip (Radix `HoverCard`) above it. The popover's extended grid swaps the bare circles for the same chip at slightly larger size (always visible, since the popover has room).
- Selected ring continues to work on either layout.
- Hex input + native `<input type="color">` unchanged.

## 3. Named favorites

**Type + store:**
- New `ColorFavorite { id; name; value: string /* hex or preset id */ }`.
- Add `colorFavorites: ColorFavorite[]` to `AppSettings` (default `[]`). Migration: `settings.colorFavorites ??= []` on hydrate.
- Store actions: `addColorFavorite(value, name?)`, `renameColorFavorite(id, name)`, `removeColorFavorite(id)`.

**Settings UI (`src/routes/settings.tsx`):**
New "Favorite colors" card under Appearance:
- Row per favorite: PreviewChip · name `<Input>` · hex display · delete.
- "Add favorite" → opens the same picker popover; selected color becomes a new favorite with placeholder name "Untitled".

**ColorPicker integration:**
- If `colorFavorites.length > 0`, render a "Favorites" strip at the top of the popover above "More swatches": each favorite is a PreviewChip with its custom name as tooltip + visible caption.
- Tiny "☆ Save" button next to the hex input writes the current `value` as a new favorite (jumps focus to a rename inline input).

## 4. Propagate colors consistently

The instance/tag color is already stored per entity; surfaces that ignore it today get wired through `colorToken/Soft/Border`:

- **Tag pills** (`FilterBar`, `ElementEditorDialog` tag selector, `BankCard`, `InstanceCard`): use `colorTokenSoft(tag.color)` for bg and `colorToken(tag.color)` for the dot/border so a custom hex tag actually tints the pill, not just the dot.
- **Status badges** (`DayCell` draft/ready/taught chips): currently fixed. Reinterpret as element-count badges that pick up the active course's color for "ready/taught" tint while keeping the textual status label — so the course color carries through the calendar grid. Draft stays neutral. (Status semantics unchanged; only the tint source changes.)
- **PDF export (`PlanModal.print`)**: today every `.el` uses hardcoded `#2563eb`. Build the HTML per-instance with inline styles derived from `colorToken(i.color)` for the left border and `colorTokenSoft(i.color)` (resolved to a static hex via a small `oklchToHex` helper so print engines render it) for the bg tint. Section headings get a thin underline in the course color. Add a tiny legend block at the top mapping each tag color → name so the printed sheet stays decodable in grayscale.

## Out of scope

- Theme tokens in `styles.css` (app chrome stays neutral).
- Contrast-warning UI.
- Reordering / drag-sort of favorites (add/rename/remove only).

## Technical notes

- `oklchToHex` lives in `constants.ts` as a small pure function (uses `culori` if already installed, otherwise a compact inline conversion — checked at implement time). Used only by the PDF path; on-screen surfaces keep emitting `oklch(...)` strings.
- `PreviewChip` is a presentational sub-component inside `ColorPicker.tsx`; no new file needed.
- All changes are additive to the existing color-string contract — no schema bump, no data migration beyond the `colorFavorites` default.

## Files touched

- `src/lib/planbook/constants.ts` — re-curated 12 presets w/ per-color L/C, new 24 extended, legacy-id alias map, `oklchToHex`.
- `src/lib/planbook/types.ts` — `ColorFavorite`, `AppSettings.colorFavorites`.
- `src/lib/planbook/store.ts` — favorite actions, hydrate default.
- `src/components/planbook/ColorPicker.tsx` — `PreviewChip`, hover preview, favorites strip, save-as-favorite.
- `src/routes/settings.tsx` — Favorite colors card.
- `src/components/planbook/FilterBar.tsx`, `BankCard.tsx`, `InstanceCard.tsx`, `ElementEditorDialog.tsx` — tag pill tinting via `colorTokenSoft`.
- `src/components/planbook/DayCell.tsx` — status badge tint from course color.
- `src/components/planbook/PlanModal.tsx` — per-instance color in printed HTML + tag legend.
