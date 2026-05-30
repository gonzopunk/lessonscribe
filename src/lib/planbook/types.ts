export type DayStatus = "draft" | "ready" | "taught";
export type Weekday = 1 | 2 | 3 | 4 | 5; // Mon..Fri (ISO)

export interface Section {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  name: string;
  color: string; // ColorId
  sections: Section[];
  periodMinutes: number;       // Mon/Tue/Thu/Fri
  wednesdayMinutes: number;
  subDefaults: string;          // free-text class management context
  createdAt: number;
}

export interface CategoryTag {
  id: string;
  courseId: string;
  name: string;
  color: string; // ColorId
}

export interface ElementTemplate {
  id: string;
  courseId: string;
  title: string;
  tagIds: string[];
  defaultMinutes: number;
  notes: string;
  links: string[];
  color: string; // ColorId
  archived?: boolean;
}

export interface ElementInstance {
  id: string;
  templateId: string;       // origin template
  courseId: string;
  dayKey: string;            // YYYY-MM-DD
  order: number;
  // snapshot at creation time so instance survives template edits
  title: string;
  tagIds: string[];
  color: string;
  defaultMinutes: number;
  // instance-specific
  content: string;           // e.g. the actual Word of the Day
  durationOverride: number | null;
  instanceNotes: string;
}

export type OverrideKind = "no_school" | "assembly" | "testing" | "custom";

export interface CalendarOverride {
  dayKey: string;             // YYYY-MM-DD
  kind: OverrideKind;
  label: string;              // user label (e.g. "Pep Rally")
  note: string;
  source: "manual" | "ical";
}

export interface DayMeta {
  // per-course, per-day
  status: DayStatus;
  notes: string;
  sectionNotes: Record<string, string>; // sectionId -> note
  objectives: string;
  standards: string;
  reflection: string;
}

export interface ColorFavorite {
  id: string;
  name: string;          // user-given label, may be ""
  value: string;         // preset id or hex
}

export interface AppSettings {
  theme: "dark" | "light" | "parchment";
  /** @deprecated kept for back-compat; migrated into bodyFontId at load time */
  fontId: string;
  headingFontId: string;
  bodyFontId: string;
  fontSize: "sm" | "md" | "lg" | "xl";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  schoolYearStart: string | null; // YYYY-MM-DD
  schoolYearEnd: string | null;
  icalUrl: string;
  weeksInView: 1 | 2 | 3 | 4;
  filterMode: "dim" | "hide";
  colorFavorites: ColorFavorite[];
  viewMode: "weeks" | "month";
  monthCourseIds: string[];
  lastIcalSyncAt: number | null;
}

export interface PlanBookState {
  version: number;
  onboarded: boolean;
  settings: AppSettings;
  courses: Course[];
  activeCourseId: string | null;
  tags: CategoryTag[];
  templates: ElementTemplate[];
  instances: ElementInstance[];
  overrides: Record<string, CalendarOverride>;       // dayKey
  dayMeta: Record<string, DayMeta>;                  // `${courseId}:${dayKey}`
  selectedFilterTagIds: string[];
  anchorDate: string;                                 // YYYY-MM-DD, monday of leftmost visible week
}
