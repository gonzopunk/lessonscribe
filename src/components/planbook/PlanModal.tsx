import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanBook, getDayMeta } from "@/lib/planbook/store";
import {
  formatDayLong,
  isWednesday,
  parseDayKey,
  dayKey as toKey,
  mondayOf,
} from "@/lib/planbook/dates";
import { colorToHex } from "@/lib/planbook/constants";
import { renderPlanHTML, openPrintWindow } from "@/lib/planbook/printPlan";
import {
  Printer,
  X,
  MoreVertical,
  UserRound,
  ArrowLeft,
  CalendarRange,
  Copy,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { CopyWeekDialog } from "./CopyWeekDialog";
import { DuplicateDayDialog } from "./DuplicateDayDialog";

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
  const allTags = usePlanBook((s) => s.tags);
  const updateDayMeta = usePlanBook((s) => s.updateDayMeta);
  const [compact, setCompact] = useState(false);
  const [currentMode, setCurrentMode] = useState<"lesson" | "sub">(mode);
  const [copyWeekOpen, setCopyWeekOpen] = useState(false);
  const [dupDayOpen, setDupDayOpen] = useState(false);

  // Sync to incoming mode whenever the modal is (re)opened with a new day or mode.
  useEffect(() => {
    if (open) setCurrentMode(mode);
  }, [open, mode, dayKey]);

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

  const isSub = currentMode === "sub";
  const sourceMondayKey = toKey(mondayOf(date));

  const print = () => {
    const body = renderPlanHTML({
      course,
      dayKey,
      meta,
      instances,
      allTags,
      mode: currentMode,
      compact,
    });
    openPrintWindow({
      title: isSub ? "Sub Plan" : "Lesson Plan",
      courseColorHex: colorToHex(course.color),
      bodyHTML: body,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="More actions">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {isSub ? (
                      <DropdownMenuItem onClick={() => setCurrentMode("lesson")}>
                        <ArrowLeft className="mr-2 size-3.5" />
                        Back to lesson plan
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setCurrentMode("sub")}>
                        <UserRound className="mr-2 size-3.5" />
                        View as sub plan
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={print}>
                      <Printer className="mr-2 size-3.5" />
                      Print / Save PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDupDayOpen(true)}>
                      <Copy className="mr-2 size-3.5" />
                      Duplicate this day…
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCopyWeekOpen(true)}>
                      <CalendarRange className="mr-2 size-3.5" />
                      Copy this week…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>

          {isSub && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
              <span>
                <span className="font-bold uppercase tracking-wider">Sub view</span> — showing
                the substitute-facing version of this lesson.
              </span>
              <button
                onClick={() => setCurrentMode("lesson")}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold hover:bg-warning/20"
              >
                <ArrowLeft className="size-3" />
                Back to lesson plan
              </button>
            </div>
          )}

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

            {course.sections.length > 1 && (
              <section className="space-y-2">
                <Label>Section notes</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {course.sections.map((sec) => (
                    <div key={sec.id} className="space-y-1">
                      <Label
                        htmlFor={`secnote-${sec.id}`}
                        className="text-xs font-normal text-muted-foreground"
                      >
                        {sec.name}
                      </Label>
                      <Textarea
                        id={`secnote-${sec.id}`}
                        rows={2}
                        value={meta.sectionNotes?.[sec.id] ?? ""}
                        onChange={(e) =>
                          updateDayMeta(course.id, dayKey, {
                            sectionNotes: {
                              ...meta.sectionNotes,
                              [sec.id]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

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

      <CopyWeekDialog
        open={copyWeekOpen}
        onOpenChange={setCopyWeekOpen}
        courseId={course.id}
        sourceMondayKey={sourceMondayKey}
        courseName={course.name}
      />
      <DuplicateDayDialog
        open={dupDayOpen}
        onOpenChange={setDupDayOpen}
        courseId={course.id}
        sourceDay={dayKey}
      />
    </>
  );
}
