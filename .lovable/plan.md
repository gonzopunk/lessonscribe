## Goal
Let users pick from a much wider range of colors anywhere a color is chosen (courses, tags, elements, onboarding, quick-add), while keeping the existing 6 presets working for all stored data.

## Approach
Keep `color: string` on Course / CategoryTag / ElementTemplate / ElementInstance. A color value is now either:
- a preset id (`"indigo"`, `"teal"`, …) — unchanged, back-compatible
- a hex string (`"#a83279"`) — new, for custom picks

`colorToken`, `colorTokenSoft`, `colorTokenBorder` detect a leading `#` and return the hex (or a `color-mix` of it) instead of the oklch hue lookup. Preset ids continue to resolve via the existing hue table.

## Changes

**`src/lib/planbook/constants.ts`**
- Expand `COURSE_COLORS` from 6 to ~18 curated swatches (add slate, sky, cyan, lime, green, yellow, orange, red, pink, fuchsia, purple, stone) with hues.
- Add `EXTENDED_SWATCHES: string[]` — a palette of ~24 hand-picked hex values for the "more colors" grid (muted + vivid, light + dark) so users get good options without a raw picker on every click.
- Update `colorToken`/`colorTokenSoft`/`colorTokenBorder` to branch on `id.startsWith("#")`:
  - hex → return hex (soft = `color-mix(in oklch, <hex> 18%, transparent)`, border = hex)
  - else → existing preset lookup

**New `src/components/planbook/ColorPicker.tsx`**
- Reusable component: `<ColorPicker value={color} onChange={fn} />`
- Renders the preset swatches inline (existing look), plus a trailing "+" button that opens a `Popover` containing:
  - the `EXTENDED_SWATCHES` grid (click → `onChange(hex)`)
  - a native `<input type="color">` for fully arbitrary picks
  - a small hex `<Input>` for typed entry (validated `/^#[0-9a-f]{6}$/i`)
- Selected ring works for both preset ids and hex values (compare against `value`).

**Wire `ColorPicker` into existing call sites** (drop-in replacement for the current swatch grids):
- `src/components/planbook/ElementEditorDialog.tsx` — element color
- `src/components/planbook/QuickAddDialog.tsx` — element color
- `src/components/planbook/OnboardingDialog.tsx` — first course color
- `src/routes/settings.tsx` — course color (line ~225) and tag color (line ~341); also default new tag color stays `"indigo"`

No store/type/migration changes — strings remain strings, old data keeps working.

## Out of scope
- Theme/semantic tokens in `styles.css` (those are the app chrome, not user-pickable).
- Per-color accessibility contrast warnings.
