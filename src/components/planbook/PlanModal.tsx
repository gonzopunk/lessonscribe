import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanBook, getDayMeta } from "@/lib/planbook/store";
import { formatDayLong, isWednesday, parseDayKey } from "@/lib/planbook/dates";
import { Printer, X } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string | null;
  dayKey: string | null;
  mode: "lesson" | "sub";
}

export function PlanModal({ open, onOpenChange, courseId, dayKey, mode }: Props) {
  const course = usePlanBook((s) => s.courses.find((c) => c.id === courseId));
  const meta = usePlanBook((s) =>
    courseId && dayKey ? getDayMeta(s, courseId, dayKey) : null,
  );
  const allInstances = usePlanBook((s) => s.instances);
  const updateDayMeta = usePlanBook((s) => s.updateDayMeta);
  const [compact, setCompact] = useState(false);
  const instances = useMemo(
    () =>
      allInstances
        .filter((i) => i.courseId === courseId && i.dayKey === dayKey)
        .sort((a, b) => a.order - b.order),
    [allInstances, courseId, dayKey],
  );

  if (!course || !dayKey || !meta) return null;
  const date = parseDayKey(dayKey);
  const periodMins = isWednesday(date) ? course.wednesdayMinutes : course.periodMinutes;
  const totalUsed = instances.reduce(
    (s, i) => s + (i.durationOverride ?? i.defaultMinutes),
    0,
  );

  const isSub = mode === "sub";

  const print = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const styles = `
      body { font-family: Georgia, serif; padding: 32px; color: #111; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin: 24px 0 8px; }
      .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
      .el { border-left: 4px solid #2563eb; padding: 8px 12px; margin: 6px 0; background: #f8fafc; }
      .el .ttl { font-weight: 700; }
      .el .dur { float: right; font-size: 12px; color: #555; }
      .el .content { font-size: 13px; margin-top: 4px; }
      .el .notes { font-size: 12px; color: #555; margin-top: 4px; font-style: italic; }
      .field { white-space: pre-wrap; font-size: 13px; }
      hr { border: 0; border-top: 1px solid #ddd; margin: 16px 0; }
    `;
    const renderEl = (i: typeof instances[number]) => `
      <div class="el">
        <span class="dur">${i.durationOverride ?? i.defaultMinutes} min</span>
        <div class="ttl">${escape(i.title)}</div>
        ${i.content && !compact ? `<div class="content">${escape(i.content)}</div>` : ""}
        ${i.instanceNotes && !compact ? `<div class="notes">${escape(i.instanceNotes)}</div>` : ""}
      </div>`;
    const body = isSub
      ? `
        <h1>Substitute Plan — ${escape(course.name)}</h1>
        <div class="meta">${formatDayLong(date)} · ${periodMins}-min period</div>
        <h2>Notes for the Substitute</h2>
        <div class="field">${escape(course.subDefaults || "—")}</div>
        <h2>Day Notes</h2>
        <div class="field">${escape(meta.notes || "—")}</div>
        <h2>Lesson Sequence</h2>
        ${instances.map(renderEl).join("")}
      `
      : `
        <h1>Lesson Plan — ${escape(course.name)}</h1>
        <div class="meta">${formatDayLong(date)} · ${periodMins}-min period · ${totalUsed} min planned</div>
        <h2>Learning Objectives</h2><div class="field">${escape(meta.objectives || "—")}</div>
        <h2>Standards</h2><div class="field">${escape(meta.standards || "—")}</div>
        <h2>Lesson Sequence</h2>${instances.map(renderEl).join("")}
        <h2>Day Notes</h2><div class="field">${escape(meta.notes || "—")}</div>
        <h2>Reflection</h2><div class="field">${escape(meta.reflection || "—")}</div>
      `;
    w.document.write(`<!doctype html><html><head><title>${isSub ? "Sub" : "Lesson"} Plan</title><style>${styles}</style></head><body>${body}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {isSub ? "Sub Plan" : "Lesson Plan"} — {course.name}
              </DialogTitle>
              <DialogDescription>
                {formatDayLong(date)} · {periodMins}-min period · {totalUsed} min planned
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Toggle
                size="sm"
                pressed={compact}
                onPressedChange={setCompact}
                aria-label="Toggle compact"
              >
                {compact ? "Expand" : "Compact"}
              </Toggle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isSub && (
            <section className="space-y-1.5">
              <Label>Notes for the Substitute</Label>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {course.subDefaults || (
                  <span className="italic text-muted-foreground">
                    Set per-course sub defaults in Settings → Courses.
                  </span>
                )}
              </div>
            </section>
          )}

          {!isSub && (
            <>
              <section className="space-y-1.5">
                <Label htmlFor="obj">Learning Objectives</Label>
                <Textarea
                  id="obj"
                  rows={2}
                  value={meta.objectives}
                  onChange={(e) =>
                    updateDayMeta(course.id, dayKey, { objectives: e.target.value })
                  }
                />
              </section>
              <section className="space-y-1.5">
                <Label htmlFor="std">Standards alignment</Label>
                <Input
                  id="std"
                  value={meta.standards}
                  onChange={(e) =>
                    updateDayMeta(course.id, dayKey, { standards: e.target.value })
                  }
                />
              </section>
            </>
          )}

          <section className="space-y-2">
            <Label>Lesson sequence</Label>
            {instances.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                No elements assigned to this day.
              </p>
            ) : (
              <div className="space-y-2">
                {instances.map((i) => (
                  <div
                    key={i.id}
                    className="rounded-md border border-border bg-card p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{i.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {i.durationOverride ?? i.defaultMinutes} min
                      </span>
                    </div>
                    {i.content && !compact && (
                      <p className="mt-1 text-sm">{i.content}</p>
                    )}
                    {i.instanceNotes && !compact && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        {i.instanceNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-1.5">
            <Label htmlFor="notes">Day notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={meta.notes}
              onChange={(e) =>
                updateDayMeta(course.id, dayKey, { notes: e.target.value })
              }
            />
          </section>

          {!isSub && (
            <section className="space-y-1.5">
              <Label htmlFor="refl">Reflection (after teaching)</Label>
              <Textarea
                id="refl"
                rows={2}
                value={meta.reflection}
                onChange={(e) =>
                  updateDayMeta(course.id, dayKey, { reflection: e.target.value })
                }
              />
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1 size-4" />
            Close
          </Button>
          <Button onClick={print}>
            <Printer className="mr-1 size-4" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
