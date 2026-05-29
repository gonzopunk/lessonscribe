import { useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  MoreVertical,
  Copy,
  CalendarOff,
  FileText,
  UserRound,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePlanBook, getDayMeta } from "@/lib/planbook/store";
import { InstanceCard } from "./InstanceCard";
import { cn } from "@/lib/utils";
import {
  dayKey as toKey,
  formatDayShort,
  isWednesday,
} from "@/lib/planbook/dates";
import type { Course, DayStatus } from "@/lib/planbook/types";

interface Props {
  date: Date;
  course: Course;
  selected: boolean;
  onSelectClick: (e: React.MouseEvent) => void;
  onOpenLessonPlan: () => void;
  onOpenSubPlan: () => void;
  onOpenOverride: () => void;
  onDuplicate: () => void;
  onQuickAdd: () => void;
}

const STATUS_NEXT: Record<DayStatus, DayStatus> = {
  draft: "ready",
  ready: "taught",
  taught: "draft",
};

const STATUS_CLASS: Record<DayStatus, string> = {
  draft: "bg-status-draft text-status-draft-foreground",
  ready: "bg-status-ready text-status-ready-foreground",
  taught: "bg-status-taught text-status-taught-foreground",
};

export function DayCell({
  date,
  course,
  selected,
  onSelectClick,
  onOpenLessonPlan,
  onOpenSubPlan,
  onOpenOverride,
  onDuplicate,
  onQuickAdd,
}: Props) {
  const dKey = toKey(date);
  const wed = isWednesday(date);
  const periodMins = wed ? course.wednesdayMinutes : course.periodMinutes;

  const override = usePlanBook((s) => s.overrides[dKey]);
  const allInstances = usePlanBook((s) => s.instances);
  const dayMeta = usePlanBook((s) => getDayMeta(s, course.id, dKey));
  const setStatus = usePlanBook((s) => s.setDayStatus);

  const [expanded, setExpanded] = useState(true);

  const instances = useMemo(
    () =>
      allInstances
        .filter((i) => i.courseId === course.id && i.dayKey === dKey)
        .sort((a, b) => a.order - b.order),
    [allInstances, course.id, dKey],
  );

  const used = instances.reduce(
    (sum, i) => sum + (i.durationOverride ?? i.defaultMinutes),
    0,
  );
  const pct = Math.min(100, Math.round((used / periodMins) * 100));
  const overrun = used > periodMins;

  const { setNodeRef, isOver } = useDroppable({
    id: `day:${course.id}:${dKey}`,
    data: { kind: "day", courseId: course.id, dayKey: dKey },
  });

  const isNoSchool = override?.kind === "no_school";

  return (
    <div
      ref={setNodeRef}
      onClick={onSelectClick}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm transition-all",
        wed ? "bg-surface-2" : "bg-card",
        isOver && "border-primary ring-2 ring-primary/30",
        selected && "ring-2 ring-primary",
        isNoSchool && "opacity-50",
        !selected && !isOver && "border-border hover:border-foreground/20",
      )}
      style={{ minHeight: expanded ? 160 : 80 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-foreground">{formatDayShort(date)}</span>
          {wed && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
              short
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {override && (
            <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
              {override.kind === "no_school" ? "No school" : override.label || override.kind}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStatus(course.id, dKey, STATUS_NEXT[dayMeta.status]);
            }}
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight transition-colors",
              STATUS_CLASS[dayMeta.status],
            )}
            title="Click to cycle status"
          >
            {dayMeta.status}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="size-5">
                <MoreVertical className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onQuickAdd}>
                <Plus className="mr-2 size-3.5" />
                Quick add element…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 size-3.5" />
                Duplicate to…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenOverride}>
                <CalendarOff className="mr-2 size-3.5" />
                Mark as no school / event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExpanded((v) => !v)}>

                {expanded ? (
                  <ChevronUp className="mr-2 size-3.5" />
                ) : (
                  <ChevronDown className="mr-2 size-3.5" />
                )}
                {expanded ? "Compact" : "Expand"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!isNoSchool && (
        <>
          <SortableContext
            items={instances.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-1 flex-col gap-1.5">
              {instances.map((inst) => (
                <InstanceCard
                  key={inst.id}
                  instance={inst}
                  compact={!expanded}
                />
              ))}
              {instances.length === 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdd();
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 py-3 text-[10px] uppercase tracking-wider text-muted-foreground/60 transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  <Plus className="size-3" />
                  Drop or add element
                </button>
              )}
            </div>
          </SortableContext>

          <div className="mt-auto">
            <div className="mb-1 flex items-center justify-between text-[10px] font-medium">
              <span className={cn(overrun ? "text-destructive" : "text-muted-foreground")}>
                {used} / {periodMins} min
              </span>
              {overrun && (
                <span className="font-bold text-destructive">OVER</span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  overrun ? "bg-destructive" : pct >= 90 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${overrun ? 100 : pct}%` }}
              />
            </div>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute inset-x-3 bottom-3 flex justify-center gap-1.5 opacity-0 transition-opacity",
              "group-hover:pointer-events-auto group-hover:opacity-100",
            )}
          >
            <Button
              size="sm"
              variant="secondary"
              className="h-7 gap-1 text-xs shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLessonPlan();
              }}
            >
              <FileText className="size-3" />
              Lesson
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1 bg-warning text-warning-foreground text-xs shadow-md hover:bg-warning/90"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSubPlan();
              }}
            >
              <UserRound className="size-3" />
              Sub
            </Button>
          </div>
        </>
      )}

      {isNoSchool && (
        <div className="flex flex-1 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {override?.label || "No school"}
        </div>
      )}
    </div>
  );
}
