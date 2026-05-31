import { PDFDocument } from "pdf-lib";
import type { WorksheetTemplate } from "./types";

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
  const doc = await PDFDocument.load(base64ToBytes(template.pdfBase64));
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
