import type { Course, DayMeta, ElementInstance, CategoryTag } from "./types";
import { formatDayLong, isWednesday, parseDayKey } from "./dates";
import { colorToHex, hexMix } from "./constants";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const PLAN_PRINT_STYLES = (courseHex: string) => `
  body { font-family: Georgia, serif; padding: 32px; color: #111; max-width: 720px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; border-bottom: 3px solid ${courseHex}; padding-bottom: 6px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin: 24px 0 8px; border-bottom: 1px solid ${hexMix(courseHex, "#ffffff", 0.7)}; padding-bottom: 2px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
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
}

export function renderPlanHTML(args: RenderPlanArgs): string {
  const { course, dayKey, meta, instances, allTags, mode, compact } = args;
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
  const legend = usedTags.length
    ? `<div class="legend">${usedTags
        .map(
          (t) =>
            `<span class="item"><span class="dot" style="background:${colorToHex(t.color)}"></span>${escape(t.name)}</span>`,
        )
        .join("")}</div>`
    : "";

  const hasSections = course.sections.length > 1;
  const sectionNotesBlock = hasSections
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

  return isSub
    ? `
      <h1>Substitute Plan — ${escape(course.name)}</h1>
      <div class="meta">${formatDayLong(date)} · ${periodMins}-min period</div>
      ${legend}
      <h2>Notes for the Substitute</h2>
      <div class="field">${escape(course.subDefaults || "—")}</div>
      <h2>Day Notes</h2>
      <div class="field">${escape(meta.notes || "—")}</div>
      ${sectionNotesBlock}
      <h2>Lesson Sequence</h2>
      ${instances.map(renderEl).join("")}
    `
    : `
      <h1>Lesson Plan — ${escape(course.name)}</h1>
      <div class="meta">${formatDayLong(date)} · ${periodMins}-min period · ${totalUsed} min planned</div>
      ${legend}
      <h2>Learning Objectives</h2><div class="field">${escape(meta.objectives || "—")}</div>
      <h2>Standards</h2><div class="field">${escape(meta.standards || "—")}</div>
      <h2>Lesson Sequence</h2>${instances.map(renderEl).join("")}
      <h2>Day Notes</h2><div class="field">${escape(meta.notes || "—")}</div>
      ${sectionNotesBlock}
      <h2>Reflection</h2><div class="field">${escape(meta.reflection || "—")}</div>
    `;
}

export function openPrintWindow(opts: {
  title: string;
  courseColorHex: string;
  bodyHTML: string;
}) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(
    `<!doctype html><html><head><title>${opts.title}</title><style>${PLAN_PRINT_STYLES(opts.courseColorHex)}</style></head><body>${opts.bodyHTML}</body></html>`,
  );
  w.document.close();
  setTimeout(() => w.print(), 200);
}
