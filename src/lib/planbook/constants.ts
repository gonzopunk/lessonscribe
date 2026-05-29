// Single place to rename the app.
export const APP_NAME = "PlanBook";

export const COURSE_COLORS = [
  { id: "indigo", label: "Indigo", hue: 250 },
  { id: "teal", label: "Teal", hue: 190 },
  { id: "rose", label: "Rose", hue: 15 },
  { id: "amber", label: "Amber", hue: 70 },
  { id: "violet", label: "Violet", hue: 295 },
  { id: "emerald", label: "Emerald", hue: 155 },
] as const;

export const TAG_COLORS = COURSE_COLORS;

export type ColorId = (typeof COURSE_COLORS)[number]["id"];

export function colorToken(id: string): string {
  const c = COURSE_COLORS.find((x) => x.id === id) ?? COURSE_COLORS[0];
  return `oklch(0.62 0.14 ${c.hue})`;
}
export function colorTokenSoft(id: string): string {
  const c = COURSE_COLORS.find((x) => x.id === id) ?? COURSE_COLORS[0];
  // works in both themes — translucent over surface
  return `color-mix(in oklch, oklch(0.62 0.14 ${c.hue}) 18%, transparent)`;
}
export function colorTokenBorder(id: string): string {
  const c = COURSE_COLORS.find((x) => x.id === id) ?? COURSE_COLORS[0];
  return `oklch(0.62 0.14 ${c.hue})`;
}

export const FONT_OPTIONS = [
  { id: "inter", label: "Inter (default)", value: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "atkinson", label: "Atkinson Hyperlegible", value: '"Atkinson Hyperlegible", ui-sans-serif, system-ui, sans-serif' },
  { id: "lexend", label: "Lexend (dyslexia-friendly)", value: '"Lexend", ui-sans-serif, system-ui, sans-serif' },
  { id: "opendyslexic", label: "OpenDyslexic", value: '"OpenDyslexic", ui-sans-serif, system-ui, sans-serif' },
] as const;
