// Single place to rename the app.
export const APP_NAME = "LessonCraft";

// 12 curated presets, ordered by hue family for adjacency.
// Each color carries its own L/C so the palette mixes vivid + muted instead
// of every swatch sitting at the same lightness/chroma.
export interface PresetColor {
  id: string;
  label: string;
  hue: number;
  l: number; // oklch lightness 0..1
  c: number; // oklch chroma
}

export const COURSE_COLORS: PresetColor[] = [
  // Warm
  { id: "coral",   label: "Coral",   hue: 25,  l: 0.70, c: 0.18 },
  { id: "amber",   label: "Amber",   hue: 70,  l: 0.78, c: 0.16 },
  { id: "ochre",   label: "Ochre",   hue: 80,  l: 0.62, c: 0.09 },
  // Green
  { id: "olive",   label: "Olive",   hue: 115, l: 0.60, c: 0.08 },
  { id: "emerald", label: "Emerald", hue: 155, l: 0.66, c: 0.16 },
  { id: "teal",    label: "Teal",    hue: 190, l: 0.66, c: 0.12 },
  // Cool
  { id: "sky",     label: "Sky",     hue: 230, l: 0.70, c: 0.14 },
  { id: "indigo",  label: "Indigo",  hue: 265, l: 0.56, c: 0.17 },
  { id: "violet",  label: "Violet",  hue: 295, l: 0.60, c: 0.16 },
  // Pink / neutral
  { id: "plum",    label: "Plum",    hue: 330, l: 0.52, c: 0.10 },
  { id: "rose",    label: "Rose",    hue: 10,  l: 0.66, c: 0.15 },
  { id: "slate",   label: "Slate",   hue: 250, l: 0.55, c: 0.03 },
];

export const TAG_COLORS = COURSE_COLORS;

export type ColorId = (typeof COURSE_COLORS)[number]["id"];

// Legacy ids → new presets, so previously-stored values still render.
const LEGACY_ALIASES: Record<string, string> = {
  fuchsia: "plum",
  purple: "violet",
  pink: "rose",
  red: "coral",
  orange: "coral",
  yellow: "amber",
  lime: "olive",
  green: "emerald",
  cyan: "teal",
  sky: "sky",
  stone: "slate",
};

// Extended hand-picked swatches for the "more colors" popover, 4 rows of 6
// alternating bright + muted within each warm/cool band.
export const EXTENDED_SWATCHES: string[] = [
  // warm vivid
  "#ff6b6b", "#fb923c", "#facc15", "#f97316", "#e11d48", "#d97706",
  // warm muted
  "#c2410c", "#92400e", "#78350f", "#a16207", "#7c2d12", "#854d0e",
  // cool vivid
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
  // cool muted
  "#0f766e", "#155e75", "#1e3a8a", "#312e81", "#581c87", "#831843",
];

const isHex = (s: string) => s.startsWith("#");

function resolvePreset(id: string): PresetColor {
  const direct = COURSE_COLORS.find((x) => x.id === id);
  if (direct) return direct;
  const aliased = LEGACY_ALIASES[id];
  if (aliased) {
    const f = COURSE_COLORS.find((x) => x.id === aliased);
    if (f) return f;
  }
  return COURSE_COLORS[7]; // indigo fallback
}

export function colorToken(id: string): string {
  if (isHex(id)) return id;
  const c = resolvePreset(id);
  return `oklch(${c.l} ${c.c} ${c.hue})`;
}
export function colorTokenSoft(id: string): string {
  const base = colorToken(id);
  return `color-mix(in oklch, ${base} 18%, transparent)`;
}
export function colorTokenBorder(id: string): string {
  return colorToken(id);
}

// Resolve any color string to a static hex, for surfaces (PDF/print window)
// where browsers can't always resolve oklch reliably.
export function colorToHex(id: string): string {
  if (isHex(id)) return id;
  const c = resolvePreset(id);
  return oklchToHex(c.l, c.c, c.hue);
}

// --- oklch → sRGB hex (compact, accurate enough for UI tinting) ---
function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  const a = Math.cos(h) * C;
  const b = Math.sin(h) * C;
  // OKLab → linear LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const lc = l_ ** 3, mc = m_ ** 3, sc = s_ ** 3;
  // Linear LMS → linear sRGB
  let r =  4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let bl =-0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;
  const toSrgb = (v: number) => {
    v = Math.max(0, Math.min(1, v));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  r = toSrgb(r); g = toSrgb(g); bl = toSrgb(bl);
  const hex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

// Mix a hex with white/black at a given amount, returns hex. Used in PDF.
export function hexMix(hex: string, withColor: string, amount: number): string {
  const parse = (h: string) => {
    const v = h.replace("#", "");
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)] as const;
  };
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(withColor);
  const lerp = (a: number, b: number) => Math.round(a * (1 - amount) + b * amount);
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(lerp(r1, r2))}${to(lerp(g1, g2))}${to(lerp(b1, b2))}`;
}

export type FontKind = "sans" | "serif" | "mono" | "display" | "accessible";

export interface FontOption {
  id: string;
  label: string;
  value: string; // CSS font-family stack
  kind: FontKind;
  /** Google Fonts URL (or other webfont stylesheet) */
  href?: string;
  /** true if suitable for body text */
  body?: boolean;
  /** true if suitable for headings */
  heading?: boolean;
  note?: string;
}

const GF = (family: string, weights = "400;500;600;700") =>
  `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weights}&display=swap`;

export const FONT_OPTIONS: FontOption[] = [
  // Sans
  { id: "inter", label: "Inter", value: '"Inter", ui-sans-serif, system-ui, sans-serif', kind: "sans", href: GF("Inter"), body: true, heading: true, note: "Default — neutral sans" },
  { id: "nunito", label: "Nunito", value: '"Nunito", ui-sans-serif, system-ui, sans-serif', kind: "sans", href: GF("Nunito"), body: true, heading: true, note: "Soft, friendly" },
  { id: "source-sans", label: "Source Sans 3", value: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif', kind: "sans", href: GF("Source Sans 3"), body: true, heading: true },
  { id: "work-sans", label: "Work Sans", value: '"Work Sans", ui-sans-serif, system-ui, sans-serif', kind: "sans", href: GF("Work Sans"), body: true, heading: true },

  // Accessible
  { id: "atkinson", label: "Atkinson Hyperlegible", value: '"Atkinson Hyperlegible", ui-sans-serif, system-ui, sans-serif', kind: "accessible", href: GF("Atkinson Hyperlegible", "400;700"), body: true, heading: true, note: "High legibility" },
  { id: "lexend", label: "Lexend", value: '"Lexend", ui-sans-serif, system-ui, sans-serif', kind: "accessible", href: GF("Lexend"), body: true, heading: true, note: "Dyslexia-friendly" },
  { id: "opendyslexic", label: "OpenDyslexic", value: '"OpenDyslexic", ui-sans-serif, system-ui, sans-serif', kind: "accessible", href: "https://fonts.cdnfonts.com/css/opendyslexic", body: true, heading: true },

  // Serif
  { id: "lora", label: "Lora", value: '"Lora", ui-serif, Georgia, serif', kind: "serif", href: GF("Lora"), body: true, heading: true, note: "Warm serif" },
  { id: "source-serif", label: "Source Serif 4", value: '"Source Serif 4", ui-serif, Georgia, serif', kind: "serif", href: GF("Source Serif 4"), body: true, heading: true },
  { id: "merriweather", label: "Merriweather", value: '"Merriweather", ui-serif, Georgia, serif', kind: "serif", href: GF("Merriweather"), body: true, heading: true, note: "Readable serif" },
  { id: "crimson", label: "Crimson Pro", value: '"Crimson Pro", ui-serif, Georgia, serif', kind: "serif", href: GF("Crimson Pro"), body: true, heading: true },
  { id: "eb-garamond", label: "EB Garamond", value: '"EB Garamond", ui-serif, Georgia, serif', kind: "serif", href: GF("EB Garamond"), body: true, heading: true, note: "Classical serif" },
  { id: "playfair", label: "Playfair Display", value: '"Playfair Display", ui-serif, Georgia, serif', kind: "display", href: GF("Playfair Display"), heading: true, note: "Headings only" },
] as const;

export const HEADING_FONTS = FONT_OPTIONS.filter((f) => f.heading);
export const BODY_FONTS = FONT_OPTIONS.filter((f) => f.body);

export function resolveFont(id: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
}
