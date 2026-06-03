import { PDFDocument } from "pdf-lib";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { resolveFieldValueForDocx } from "./worksheetResolver";
import { loadWorksheetBlob } from "./worksheetBlobs";
import type { PlanBookState, WorksheetTemplate } from "./types";

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getTemplatePdfBase64(template: WorksheetTemplate): Promise<string> {
  if (template.pdfBase64) return template.pdfBase64;
  const blob = await loadWorksheetBlob(template.id);
  if (!blob?.pdfBase64) throw new Error("Template file not found. Re-upload the PDF in Settings.");
  return blob.pdfBase64;
}

async function getTemplateDocxBase64(template: WorksheetTemplate): Promise<string> {
  if (template.docxBase64) return template.docxBase64;
  const blob = await loadWorksheetBlob(template.id);
  if (!blob?.docxBase64) throw new Error("Template file not found. Re-upload the document in Settings.");
  return blob.docxBase64;
}

export async function fillWorksheetPdf(
  template: WorksheetTemplate,
  resolvedValues: Record<string, string>,
  flatten: boolean,
): Promise<Uint8Array> {
  const b64 = await getTemplatePdfBase64(template);
  const doc = await PDFDocument.load(base64ToBytes(b64));
  const form = doc.getForm();
  for (const mapping of template.fieldMappings) {
    try {
      const field = form.getTextField(mapping.fieldName);
      field.setText(resolvedValues[mapping.fieldName] ?? "");
    } catch {
      // field not found / not a text field — skip silently
    }
  }
  if (flatten) {
    try {
      form.flatten();
    } catch {
      // ignore
    }
  }
  return await doc.save();
}

export function triggerPdfDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Repair `{{ ... }}` placeholders that Word split across multiple `<w:r>` runs
 * (typically because of inline formatting changes inside the tag). Without this,
 * docxtemplater can't see the tag and silently leaves the field blank.
 *
 * Operates per `<w:p>` paragraph: for every `{{...}}` span, strip any
 * `</w:t>...<w:t...>` sequences that fall inside the span so the tag ends up
 * living in a single `<w:t>` run, inheriting the first run's formatting.
 */
function repairSplitTags(xml: string): string {
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (para) => {
    let result = "";
    let i = 0;
    while (i < para.length) {
      const open = para.indexOf("{{", i);
      if (open === -1) {
        result += para.slice(i);
        break;
      }
      result += para.slice(i, open);
      const close = para.indexOf("}}", open + 2);
      if (close === -1) {
        result += para.slice(open);
        break;
      }
      const segment = para.slice(open, close + 2);
      const cleaned = segment.replace(/<\/w:t>[\s\S]*?<w:t[^>]*>/g, "");
      result += cleaned;
      i = close + 2;
    }
    return result;
  });
}

const REPAIRABLE_PARTS = /^word\/(document|header\d*|footer\d*)\.xml$/;

// Word markup that docx-preview does not render faithfully — Word text boxes,
// callouts, drawing shapes with embedded text. When present, the in-app
// preview will silently drop the field even though the downloaded DOCX is
// correct, so we detect this and surface a warning to the user.
const UNSUPPORTED_LAYOUT_MARKERS = [
  "<w:txbxContent",
  "<wps:txbx",
  "<v:textbox",
];

function detectUnsupportedLayout(zip: PizZip): boolean {
  for (const path of Object.keys(zip.files)) {
    if (!REPAIRABLE_PARTS.test(path)) continue;
    const txt = zip.file(path)?.asText() ?? "";
    for (const marker of UNSUPPORTED_LAYOUT_MARKERS) {
      if (txt.includes(marker)) return true;
    }
  }
  return false;
}

export interface FilledDocxResult {
  bytes: Uint8Array;
  /** True when the .docx uses Word text boxes/callouts that the in-app
   *  preview cannot render reliably. Download still works. */
  hasUnsupportedLayout: boolean;
}

export async function fillDocxTemplate(
  template: WorksheetTemplate,
  courseId: string,
  weekMonday: Date,
  state: PlanBookState,
): Promise<FilledDocxResult> {
  const bytes = base64ToBytes(template.docxBase64!);
  const zip = new PizZip(bytes);

  // Pre-process: heal split-run placeholders so docxtemplater can find every tag.
  for (const path of Object.keys(zip.files)) {
    if (!REPAIRABLE_PARTS.test(path)) continue;
    const file = zip.file(path);
    if (!file) continue;
    const original = file.asText();
    const repaired = repairSplitTags(original);
    if (repaired !== original) zip.file(path, repaired);
  }

  const hasUnsupportedLayout = detectUnsupportedLayout(zip);

  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
  });
  const data: Record<string, string | string[]> = {};
  for (const mapping of template.fieldMappings) {
    data[mapping.fieldName] = resolveFieldValueForDocx(
      mapping.source,
      courseId,
      weekMonday,
      state,
    );
  }
  try {
    doc.render(data);
  } catch (e: unknown) {
    const err = e as {
      properties?: {
        errors?: Array<{
          properties?: { id?: string; explanation?: string; xtag?: string };
        }>;
      };
      message?: string;
    };
    const errors = err?.properties?.errors;
    if (errors && errors.length) {
      for (const sub of errors) {
        console.warn(
          "[docxtemplater]",
          sub.properties?.id,
          sub.properties?.xtag,
          sub.properties?.explanation,
        );
      }
      const first = errors[0]?.properties;
      throw new Error(
        `Template error on tag "${first?.xtag ?? "?"}": ${first?.explanation ?? err.message ?? "unknown"}`,
      );
    }
    throw e;
  }
  return {
    bytes: doc.getZip().generate({ type: "uint8array" }),
    hasUnsupportedLayout,
  };
}

export function triggerDocxDownload(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
