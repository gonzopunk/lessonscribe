import ICAL from "ical.js";
import type { OverrideKind } from "./types";
import { dayKey } from "./dates";

export interface IcalEntry {
  dayKey: string;
  label: string;
  kind: OverrideKind;
}

function classify(summary: string): OverrideKind {
  const s = summary.toLowerCase();
  if (/(no school|holiday|break|closed|vacation)/.test(s)) return "no_school";
  if (/(assembly|pep rally)/.test(s)) return "assembly";
  if (/(testing|test day|exam)/.test(s)) return "testing";
  return "custom";
}

/**
 * Fetch an iCal feed via our server proxy and parse it into per-day overrides.
 * Expands multi-day all-day events into individual day keys.
 */
export async function fetchAndParseIcal(url: string): Promise<IcalEntry[]> {
  if (!url || !/^https:\/\//i.test(url)) {
    throw new Error("iCal URL must start with https://");
  }
  const res = await fetch(`/api/public/ical-proxy?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to fetch iCal (${res.status}): ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  const jcal = ICAL.parse(text);
  const comp = new ICAL.Component(jcal);
  const events = comp.getAllSubcomponents("vevent");
  const out: IcalEntry[] = [];

  for (const ev of events) {
    const e = new ICAL.Event(ev);
    const summary = (e.summary || "").trim();
    if (!summary) continue;
    const kind = classify(summary);

    const start = e.startDate;
    const end = e.endDate;
    if (!start) continue;

    // Only treat all-day events as override-worthy
    if (!start.isDate) continue;

    const startJs: Date = start.toJSDate();
    // iCal DTEND for all-day events is exclusive
    const endJs: Date = end ? end.toJSDate() : new Date(startJs.getTime() + 86400000);

    for (
      let cur = new Date(startJs);
      cur < endJs;
      cur = new Date(cur.getTime() + 86400000)
    ) {
      out.push({ dayKey: dayKey(cur), label: summary, kind });
    }
  }
  return out;
}
