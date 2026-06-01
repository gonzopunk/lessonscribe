import { PDFDocument } from "pdf-lib";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { resolveFieldValueForDocx } from "./worksheetResolver";
import type { PlanBookState, WorksheetTemplate } from "./types";

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function fillWorksheetPdf(
  template: WorksheetTemplate,
  resolvedValues: Record<string, string>,
  flatten: boolean,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(base64ToBytes(template.pdfBase64!));
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

export async function fillDocxTemplate(
  template: WorksheetTemplate,
  courseId: string,
  weekMonday: Date,
  state: PlanBookState,
): Promise<Uint8Array> {
  const bytes = base64ToBytes(template.docxBase64!);
  const zip = new PizZip(bytes);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: "{{", end: "}}" },
    paragraphLoop: true,
    linebreaks: true,
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
  doc.render(data);
  return doc.getZip().generate({ type: "uint8array" });
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
