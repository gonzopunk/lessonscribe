export interface ExportSectionFlags {
  coverPage: boolean;
  objectives: boolean;
  standards: boolean;
  sequence: boolean;
  dayNotes: boolean;
  sectionNotes: boolean;
  reflection: boolean;
  differentiation: boolean;
  behaviorNotes: boolean;
  materials: boolean;
  subNotes: boolean;
  tagLegend: boolean;
  pageNumbers: boolean;
  runningHeader: boolean;
}

export interface ExportHeaderInfo {
  teacherName: string;
  schoolName: string;
  room: string;
  email: string;
}

export type ExportPresetId = "teacher" | "sub" | "admin" | "formal" | "custom";

export interface ExportProfile {
  preset: ExportPresetId;
  mode: "lesson" | "sub";
  compact: boolean;
  includeEmpty: boolean;
  orientation: "portrait" | "landscape";
  fontFamily: string;
  sections: ExportSectionFlags;
  header: ExportHeaderInfo;
}

const baseSections: ExportSectionFlags = {
  coverPage: false,
  objectives: true,
  standards: true,
  sequence: true,
  dayNotes: true,
  sectionNotes: true,
  reflection: true,
  differentiation: false,
  behaviorNotes: false,
  materials: true,
  subNotes: true,
  tagLegend: true,
  pageNumbers: true,
  runningHeader: true,
};

export const DEFAULT_HEADER: ExportHeaderInfo = {
  teacherName: "",
  schoolName: "",
  room: "",
  email: "",
};

export const EXPORT_FONT_OPTIONS: Array<{ id: string; label: string; stack: string }> = [
  { id: "inter", label: "Inter (sans)", stack: "'Inter', system-ui, sans-serif" },
  { id: "lora", label: "Lora (serif)", stack: "'Lora', Georgia, serif" },
  { id: "source-serif", label: "Source Serif 4", stack: "'Source Serif 4', Georgia, serif" },
  { id: "atkinson", label: "Atkinson Hyperlegible", stack: "'Atkinson Hyperlegible', system-ui, sans-serif" },
  { id: "lexend", label: "Lexend", stack: "'Lexend', system-ui, sans-serif" },
  { id: "georgia", label: "Georgia (system serif)", stack: "Georgia, 'Times New Roman', serif" },
];

export const EXPORT_PRESETS: Record<
  Exclude<ExportPresetId, "custom">,
  Omit<ExportProfile, "preset" | "header">
> = {
  teacher: {
    mode: "lesson",
    compact: false,
    includeEmpty: false,
    orientation: "portrait",
    fontFamily: "inter",
    sections: { ...baseSections, coverPage: false, reflection: true, subNotes: false },
  },
  sub: {
    mode: "sub",
    compact: false,
    includeEmpty: true,
    orientation: "portrait",
    fontFamily: "atkinson",
    sections: {
      ...baseSections,
      coverPage: true,
      objectives: false,
      standards: false,
      reflection: false,
      subNotes: true,
    },
  },
  admin: {
    mode: "lesson",
    compact: true,
    includeEmpty: false,
    orientation: "portrait",
    fontFamily: "inter",
    sections: {
      ...baseSections,
      coverPage: false,
      sequence: true,
      sectionNotes: false,
      reflection: false,
      subNotes: false,
      tagLegend: true,
    },
  },
  formal: {
    mode: "lesson",
    compact: false,
    includeEmpty: false,
    orientation: "portrait",
    fontFamily: "source-serif",
    sections: {
      ...baseSections,
      coverPage: true,
      reflection: false,
      subNotes: false,
    },
  },
};

export function makeProfile(preset: Exclude<ExportPresetId, "custom">): ExportProfile {
  return {
    preset,
    header: { ...DEFAULT_HEADER },
    ...EXPORT_PRESETS[preset],
  };
}
