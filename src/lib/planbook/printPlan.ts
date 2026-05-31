import type { Course, DayMeta, ElementInstance, CategoryTag } from "./types";
import { formatDayLong, isWednesday, parseDayKey } from "./dates";
import { colorToHex, hexMix } from "./constants";
import type {
  ExportSectionFlags,
  ExportHeaderInfo,
} from "./exportPresets";
import { EXPORT_FONT_OPTIONS } from "./exportPresets";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ALL_SECTIONS: ExportSectionFlags = {
  coverPage: false,
  objectives: true,
  standards: true,
  sequence: true,
  dayNotes: true,
  sectionNotes: true,
  reflection: true,
  differentiation: true,
  behaviorNotes: false,
  materials: true,
  subNotes: true,
  tagLegend: true,
  pageNumbers: true,
  runningHeader: true,
};

function fontStack(fontFamily?: string) {
  const opt = EXPORT_FONT_OPTIONS.find((f) => f.id === fontFamily);
  return opt?.stack ?? "Georgia, 'Times New Roman', serif";
}

export const PLAN_PRINT_STYLES = (
  courseHex: string,
  opts: {
    fontFamily?: string;
    orientation?: "portrait" | "landscape";
    pageNumbers?: boolean;
    runningHeader?: boolean;
    runningHeaderText?: string;
  } = {},
) => `
  @page {
    size: ${opts.orientation === "landscape" ? "Letter landscape" : "Letter portrait"};
    margin: 0.6in 0.55in 0.7in 0.55in;
    ${opts.runningHeader && opts.runningHeaderText ? `@top-center { content: "${opts.runningHeaderText.replace(/"/g, "'")}"; font-family: ${fontStack(opts.fontFamily)}; font-size: 9pt; color: #777; }` : ""}
    ${opts.pageNumbers ? `@bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: ${fontStack(opts.fontFamily)}; font-size: 9pt; color: #777; }` : ""}
  }
  body { font-family: ${fontStack(opts.fontFamily)}; padding: 0; color: #111; max-width: ${opts.orientation === "landscape" ? "100%" : "740px"}; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; border-bottom: 3px solid ${courseHex}; padding-bottom: 6px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin: 22px 0 6px; border-bottom: 1px solid ${hexMix(courseHex, "#ffffff", 0.7)}; padding-bottom: 2px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 16px; }
  .doc-header { border-bottom: 2px solid ${courseHex}; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .doc-header .who { font-size: 11px; color: #555; text-align: right; line-height: 1.4; }
  .doc-header .who strong { display: block; font-size: 13px; color: #111; }
  .cover { page-break-after: always; padding: 80px 40px; text-align: center; }
  .cover .title { font-size: 32px; font-weight: 700; border-bottom: 4px solid ${courseHex}; display: inline-block; padding-bottom: 8px; margin-bottom: 16px; }
  .cover .sub { font-size: 14px; color: #555; margin-top: 8px; }
  .el { border-left: 4px solid #2563eb; padding: 8px 12px; margin: 6px 0; background: #f8fafc; border-radius: 3px; }
  .el .ttl { font-weight: 700; }
  .el .dur { float: right; font-size: 12px; color: #555; }
  .el .content { font-size: 13px; margin-top: 4px; }
  .el .notes { font-size: 12px; color: #555; margin-top: 4px; font-style: italic; }
  .el .tags { font-size: 11px; color: #555; margin-top: 4px; }
  .el .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; border: 1px solid #ccc; margin-right: 4px; }
  .field { white-space: pre-wrap; font-size: 13px; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 16px; font-size: 11px; color: #444; }
  .legend .item { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 999px; border: 1px solid #ddd; }
  .legend .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
  hr { border: 0; border-top: 1px solid #ddd; margin: 16px 0; }
  .page-break { page-break-before: always; }
`;

export interface RenderPlanArgs {
  course: Course;
  dayKey: string;
  meta: DayMeta;
  instances: ElementInstance[];
  allTags: CategoryTag[];
  mode: "lesson" | "sub";
  compact: boolean;
  sections?: ExportSectionFlags;
  header?: ExportHeaderInfo;
}

export function renderPlanHTML(args: RenderPlanArgs): string {
  const {
    course,
    dayKey,
    meta,
    instances,
    allTags,
    mode,
    compact,
    sections = ALL_SECTIONS,
    header,
  } = args;
  const isSub = mode === "sub";
  const date = parseDayKey(dayKey);
  const periodMins = isWednesday(date) ? course.wednesdayMinutes : course.periodMinutes;
  const totalUsed = instances.reduce(
    (s, i) => s + (i.durationOverride ?? i.defaultMinutes),
    0,
  );

  const renderEl = (i: ElementInstance) => {
    const hex = colorToHex(i.color);
    const tint = hexMix(hex, "#ffffff", 0.88);
    const tagPills = i.tagIds
      .map((tid) => allTags.find((t) => t.id === tid))
      .filter(Boolean)
      .map((t) => {
        const th = colorToHex(t!.color);
        return `<span class="tag" style="background:${hexMix(th, "#ffffff", 0.85)};border-color:${th};color:${hexMix(th, "#000000", 0.4)}">${escape(t!.name)}</span>`;
      })
      .join("");
    return `
      <div class="el" style="border-left-color:${hex};background:${tint}">
        <span class="dur">${i.durationOverride ?? i.defaultMinutes} min</span>
        <div class="ttl">${escape(i.title)}</div>
        ${i.content && !compact ? `<div class="content">${escape(i.content)}</div>` : ""}
        ${i.instanceNotes && !compact ? `<div class="notes">${escape(i.instanceNotes)}</div>` : ""}
        ${tagPills && !compact ? `<div class="tags">${tagPills}</div>` : ""}
      </div>`;
  };

  const usedTagIds = Array.from(new Set(instances.flatMap((i) => i.tagIds)));
  const usedTags = usedTagIds
    .map((id) => allTags.find((t) => t.id === id))
    .filter(Boolean) as CategoryTag[];
  const legend =
    sections.tagLegend && usedTags.length
      ? `<div class="legend">${usedTags
          .map(
            (t) =>
              `<span class="item"><span class="dot" style="background:${colorToHex(t.color)}"></span>${escape(t.name)}</span>`,
          )
          .join("")}</div>`
      : "";

  const headerBand = header && (header.teacherName || header.schoolName || header.room || header.email)
    ? `<div class="doc-header">
        <div class="title-wrap"><h1 style="border:0;margin:0;padding:0">${isSub ? "Substitute Plan" : "Lesson Plan"} — ${escape(course.name)}</h1>
        <div class="meta" style="margin:0">${formatDayLong(date)} · ${periodMins}-min period${!isSub ? ` · ${totalUsed} min planned` : ""}</div></div>
        <div class="who">
          ${header.teacherName ? `<strong>${escape(header.teacherName)}</strong>` : ""}
          ${header.schoolName ? `${escape(header.schoolName)}<br/>` : ""}
          ${header.room ? `Room ${escape(header.room)}<br/>` : ""}
          ${header.email ? `${escape(header.email)}` : ""}
        </div>
      </div>`
    : `<h1>${isSub ? "Substitute Plan" : "Lesson Plan"} — ${escape(course.name)}</h1>
       <div class="meta">${formatDayLong(date)} · ${periodMins}-min period${!isSub ? ` · ${totalUsed} min planned` : ""}</div>`;

  const hasSections = course.sections.length > 1;
  const sectionNotesBlock =
    sections.sectionNotes && hasSections
      ? (() => {
          const rows = course.sections
            .map((sec) => {
              const note = meta.sectionNotes?.[sec.id] ?? "";
              if (!note.trim()) return "";
              return `<h2>${escape(sec.name)}</h2><div class="field">${escape(note)}</div>`;
            })
            .join("");
          return rows ? `<h2>Section Notes</h2>${rows}` : "";
        })()
      : "";

  const parts: string[] = [headerBand, legend];

  if (isSub) {
    if (sections.subNotes)
      parts.push(
        `<h2>Notes for the Substitute</h2><div class="field">${escape(course.subDefaults || "—")}</div>`,
      );
    if (sections.dayNotes)
      parts.push(`<h2>Day Notes</h2><div class="field">${escape(meta.notes || "—")}</div>`);
    if (sections.differentiation && ((meta.differentiationNotes ?? "") || !compact))
      parts.push(`<h2>Differentiation / 504 &amp; IEP</h2><div class="field">${escape((meta.differentiationNotes ?? "") || "—")}</div>`);
    if (sections.materials && ((meta.materialsNotes ?? "") || !compact))
      parts.push(`<h2>Materials</h2><div class="field">${escape((meta.materialsNotes ?? "") || "—")}</div>`);
    parts.push(sectionNotesBlock);
    if (sections.sequence)
      parts.push(`<h2>Lesson Sequence</h2>${instances.map(renderEl).join("") || "<p>—</p>"}`);
  } else {
    if (sections.objectives)
      parts.push(`<h2>Learning Objectives</h2><div class="field">${escape(meta.objectives || "—")}</div>`);
    if (sections.standards)
      parts.push(`<h2>Standards</h2><div class="field">${escape(meta.standards || "—")}</div>`);
    if (sections.differentiation && ((meta.differentiationNotes ?? "") || !compact))
      parts.push(`<h2>Differentiation / 504 &amp; IEP</h2><div class="field">${escape((meta.differentiationNotes ?? "") || "—")}</div>`);
    if (sections.materials && ((meta.materialsNotes ?? "") || !compact))
      parts.push(`<h2>Materials</h2><div class="field">${escape((meta.materialsNotes ?? "") || "—")}</div>`);
    if (sections.sequence)
      parts.push(`<h2>Lesson Sequence</h2>${instances.map(renderEl).join("") || "<p>—</p>"}`);
    if (sections.dayNotes)
      parts.push(`<h2>Day Notes</h2><div class="field">${escape(meta.notes || "—")}</div>`);
    parts.push(sectionNotesBlock);
    if (sections.reflection)
      parts.push(`<h2>Reflection</h2><div class="field">${escape(meta.reflection || "—")}</div>`);
    if (sections.behaviorNotes && ((meta.behaviorNotes ?? "") || !compact))
      parts.push(`<h2>Behavior Notes</h2><div class="field">${escape((meta.behaviorNotes ?? "") || "—")}</div>`);
  }

  return parts.filter(Boolean).join("\n");
}

export interface OpenPrintOptions {
  title: string;
  courseColorHex: string;
  bodyHTML: string;
  fontFamily?: string;
  orientation?: "portrait" | "landscape";
  pageNumbers?: boolean;
  runningHeader?: boolean;
  runningHeaderText?: string;
}

export function buildPrintDocument(opts: OpenPrintOptions): string {
  const fontLinks = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Inter:wght@400;600;700&family=Lexend:wght@400;600&family=Lora:wght@400;600;700&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet">
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${opts.title}</title>${fontLinks}<style>${PLAN_PRINT_STYLES(
    opts.courseColorHex,
    {
      fontFamily: opts.fontFamily,
      orientation: opts.orientation,
      pageNumbers: opts.pageNumbers,
      runningHeader: opts.runningHeader,
      runningHeaderText: opts.runningHeaderText,
    },
  )}</style></head><body>${opts.bodyHTML}</body></html>`;
}

export function openPrintWindow(opts: OpenPrintOptions) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(buildPrintDocument(opts));
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export function renderCoverPage(opts: {
  title: string;
  subtitle?: string;
  header?: ExportHeaderInfo;
}): string {
  const h = opts.header;
  const whoLines = h
    ? [h.teacherName, h.schoolName, h.room ? `Room ${h.room}` : "", h.email]
        .filter(Boolean)
        .map((l) => `<div>${escape(l!)}</div>`)
        .join("")
    : "";
  return `<div class="cover">
    <div class="title">${escape(opts.title)}</div>
    ${opts.subtitle ? `<div class="sub">${escape(opts.subtitle)}</div>` : ""}
    ${whoLines ? `<div class="sub" style="margin-top:24px">${whoLines}</div>` : ""}
  </div>`;
}
