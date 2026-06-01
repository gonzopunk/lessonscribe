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
  weekMetaLabel1?: string;      // defaults to "Custom note 1" when absent
  weekMetaLabel2?: string;      // defaults to "Custom note 2" when absent
  weekMetaLabel3?: string;      // defaults to "Custom note 3" when absent
  weekMetaLabel4?: string;      // defaults to "Custom note 4" when absent
  weekMetaLabel5?: string;      // defaults to "Custom note 5" when absent
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
  feedId?: string;            // when source === "ical"
}

export interface DayMeta {
  // per-course, per-day
  status: DayStatus;
  notes: string;
  sectionNotes: Record<string, string>; // sectionId -> note
  objectives: string;
  standards: string;
  reflection: string;
  differentiationNotes: string;  // 504/IEP accommodations and differentiation
  behaviorNotes: string;         // behavior management notes
  materialsNotes: string;        // materials needed for the lesson
}

export interface ColorFavorite {
  id: string;
  name: string;          // user-given label, may be ""
  value: string;         // preset id or hex
}

export interface IcalFeed {
  id: string;
  label: string;            // e.g. "District days off"
  url: string;
  color: string;            // ColorId (for future per-feed coloring)
  enabled: boolean;
  lastSyncAt: number | null;
}

export interface AppSettings {
  theme: "dark" | "light" | "parchment";
  /** @deprecated migrated into bodyFontId */
  fontId: string;
  headingFontId: string;
  bodyFontId: string;
  fontSize: "sm" | "md" | "lg" | "xl";
  density: "comfortable" | "compact";
  reduceMotion: boolean;
  schoolYearStart: string | null; // YYYY-MM-DD
  schoolYearEnd: string | null;
  icalFeeds: IcalFeed[];
  weeksInView: 1 | 2 | 3 | 4;
  filterMode: "dim" | "hide";
  colorFavorites: ColorFavorite[];
  viewMode: "weeks" | "month";
  monthCourseIds: string[];
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
  worksheetTemplates: WorksheetTemplate[];
  weekMeta: Record<string, WeekMeta>;                 // `week:${courseId}:${weekKey}`
}

// ---------- Worksheet Generator ----------

export type DayOffset = 0 | 1 | 2 | 3 | 4; // 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri

export type FieldSource =
  | { type: "element-content"; dayOffset: DayOffset; tagId: string }
  | { type: "element-titles"; dayOffset: DayOffset; tagId?: string; separator: string }
  | { type: "day-notes"; dayOffset: DayOffset }
  | { type: "day-objectives"; dayOffset: DayOffset }
  | { type: "day-differentiation"; dayOffset: DayOffset }
  | { type: "day-behavior"; dayOffset: DayOffset }
  | { type: "day-materials"; dayOffset: DayOffset }
  | { type: "week-of-date"; format: string }
  | { type: "day-date"; dayOffset: DayOffset; format: string }
  | { type: "static"; text: string }
  | { type: "week-objectives" }
  | { type: "week-essential-question" }
  | { type: "week-notes" }
  | { type: "week-custom"; fieldKey: "custom1" | "custom2" };

export interface FieldMapping {
  fieldName: string;
  source: FieldSource;
  characterBudget?: number;
}

export interface WorksheetTemplate {
  id: string;
  courseId: string;
  name: string;
  pdfBase64: string;
  detectedFields: string[];
  fieldMappings: FieldMapping[];
}

export interface WeekMeta {
  weeklyObjectives: string;
  essentialQuestion: string;
  weeklyNotes: string;
  custom1: string;
  custom2: string;
}

export const blankWeekMeta = (): WeekMeta => ({
  weeklyObjectives: "",
  essentialQuestion: "",
  weeklyNotes: "",
  custom1: "",
  custom2: "",
});

