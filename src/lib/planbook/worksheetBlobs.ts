import { createStore, get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export interface WorksheetBlob {
  pdfBase64?: string;
  docxBase64?: string;
}

const store = createStore("planbook-worksheet-blobs", "blobs");

// In-memory cache to avoid repeated IndexedDB hits within a session.
const cache = new Map<string, WorksheetBlob>();

export async function saveWorksheetBlob(id: string, blob: WorksheetBlob): Promise<void> {
  cache.set(id, blob);
  try {
    await idbSet(id, blob, store);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[worksheetBlobs] save failed", id, err);
  }
}

export async function loadWorksheetBlob(id: string): Promise<WorksheetBlob | undefined> {
  if (cache.has(id)) return cache.get(id);
  try {
    const v = (await idbGet<WorksheetBlob>(id, store)) ?? undefined;
    if (v) cache.set(id, v);
    return v;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[worksheetBlobs] load failed", id, err);
    return undefined;
  }
}

export async function deleteWorksheetBlob(id: string): Promise<void> {
  cache.delete(id);
  try {
    await idbDel(id, store);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[worksheetBlobs] delete failed", id, err);
  }
}
