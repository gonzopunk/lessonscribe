// Single place to rename the app.
export const APP_NAME = "PlanBook";

export const COURSE_COLORS = [
  { id: "indigo", label: "Indigo", hue: 250 },
  { id: "teal", label: "Teal", hue: 190 },
  { id: "rose", label: "Rose", hue: 15 },
  { id: "amber", label: "Amber", hue: 70 },
  { id: "violet", label: "Violet", hue: 295 },
  { id: "emerald", label: "Emerald", hue: 155 },
  { id: "slate", label: "Slate", hue: 240 },
  { id: "sky", label: "Sky", hue: 220 },
  { id: "cyan", label: "Cyan", hue: 200 },
  { id: "lime", label: "Lime", hue: 130 },
  { id: "green", label: "Green", hue: 145 },
  { id: "yellow", label: "Yellow", hue: 90 },
  { id: "orange", label: "Orange", hue: 50 },
  { id: "red", label: "Red", hue: 25 },
  { id: "pink", label: "Pink", hue: 350 },
  { id: "fuchsia", label: "Fuchsia", hue: 320 },
  { id: "purple", label: "Purple", hue: 275 },
  { id: "stone", label: "Stone", hue: 60 },
] as const;

export const TAG_COLORS = COURSE_COLORS;

export type ColorId = (typeof COURSE_COLORS)[number]["id"];

// Extended hand-picked swatches for the "more colors" popover.
export const EXTENDED_SWATCHES: string[] = [
  "#0f172a", "#1e293b", "#334155", "#64748b", "#94a3b8", "#cbd5e1",
  "#7f1d1d", "#dc2626", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#16a34a", "#059669", "#0d9488", "#06b6d4", "#0284c7", "#1d4ed8",
  "#4338ca", "#6d28d9", "#9333ea", "#c026d3", "#db2777", "#e11d48",
];

const isHex = (s: string) => s.startsWith("#");

export function colorToken(id: string): string {
  if (isHex(id)) return id;
  const c = COURSE_COLORS.find((x) => x.id === id) ?? COURSE_COLORS[0];
  return `oklch(0.62 0.14 ${c.hue})`;
}
export function colorTokenSoft(id: string): string {
  if (isHex(id)) return `color-mix(in oklch, ${id} 18%, transparent)`;
  const c = COURSE_COLORS.find((x) => x.id === id) ?? COURSE_COLORS[0];
  return `color-mix(in oklch, oklch(0.62 0.14 ${c.hue}) 18%, transparent)`;
}
export function colorTokenBorder(id: string): string {
  if (isHex(id)) return id;
  const c = COURSE_COLORS.find((x) => x.id === id) ?? COURSE_COLORS[0];
  return `oklch(0.62 0.14 ${c.hue})`;
}

export const FONT_OPTIONS = [
  { id: "inter", label: "Inter (default)", value: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "atkinson", label: "Atkinson Hyperlegible", value: '"Atkinson Hyperlegible", ui-sans-serif, system-ui, sans-serif' },
  { id: "lexend", label: "Lexend (dyslexia-friendly)", value: '"Lexend", ui-sans-serif, system-ui, sans-serif' },
  { id: "opendyslexic", label: "OpenDyslexic", value: '"OpenDyslexic", ui-sans-serif, system-ui, sans-serif' },
] as const;
