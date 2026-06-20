import { useMemo, useState } from "react";
import { addDays, addMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePlanBook } from "@/lib/planbook/store";
import { dayKey as toKey, mondayOf } from "@/lib/planbook/dates";
import { colorToken, colorTokenSoft } from "@/lib/planbook/constants";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  monthAnchor: Date;
  onOpenPlan: (courseId: string, dKey: string) => void;
  onOpenOverride: (dKey: string) => void;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthView({ monthAnchor, onOpenPlan, onOpenOverride }: Props) {
  const courses = usePlanBook((s) => s.courses);
  const monthCourseIds = usePlanBook((s) => s.settings.monthCourseIds);
  const updateSettings = usePlanBook((s) => s.updateSettings);
  const instances = usePlanBook((s) => s.instances);
  const overrides = usePlanBook((s) => s.overrides);
  const tags = usePlanBook((s) => s.tags);

  const selectedCourseIds =
    monthCourseIds.length > 0
      ? monthCourseIds.filter((id) => courses.some((c) => c.id === id))
      : courses.map((c) => c.id);

  const weeks = useMemo(() => {
    const start = mondayOf(startOfMonth(monthAnchor));
    const endMonth = endOfMonth(monthAnchor);
    const result: Date[][] = [];
    let cur = start;
    while (cur <= endMonth || result.length < 5) {
      const week: Date[] = [];
      for (let i = 0; i < 5; i++) week.push(addDays(cur, i));
      result.push(week);
      cur = addDays(cur, 7);
      if (result.length >= 6) break;
    }
    return result;
  }, [monthAnchor]);

  const displayMonth = startOfMonth(monthAnchor);
  const monthIndex = displayMonth.getMonth();
  const displayYear = displayMonth.getFullYear();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(displayYear);

  const countFor = (cid: string, dk: string) =>
    instances.filter((i) => i.courseId === cid && i.dayKey === dk).length;

  const toggleCourse = (id: string) => {
    const next = selectedCourseIds.includes(id)
      ? selectedCourseIds.filter((x) => x !== id)
      : [...selectedCourseIds, id];
    updateSettings({ monthCourseIds: next });
  };

  const selectAll = () => updateSettings({ monthCourseIds: courses.map((c) => c.id) });
  const clearAll = () => updateSettings({ monthCourseIds: [] });

  const useTwoCol = selectedCourseIds.length >= 4;

  const selectMonth = (m: number) => {
    usePlanBook.getState().setAnchor(toKey(new Date(pickerYear, m, 1)));
    setPickerOpen(false);
    setPickerYear(pickerYear);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-surface/95 px-5 py-2 backdrop-blur">
        <div className="mr-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Previous month"
            onClick={() => {
              const next = addMonths(monthAnchor, -1);
              usePlanBook.getState().setAnchor(toKey(startOfMonth(next)));
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Popover
            open={pickerOpen}
            onOpenChange={(o) => {
              setPickerOpen(o);
              if (o) setPickerYear(displayYear);
            }}
          >
            <PopoverTrigger asChild>
              <span className="min-w-[8.5rem] cursor-pointer text-center text-xs font-semibold decoration-1 underline-offset-4 hover:underline">
                {format(displayMonth, "MMMM yyyy")}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3" align="center">
              <div className="mb-2 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Previous year"
                  onClick={() => setPickerYear((y) => y - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-semibold">{pickerYear}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Next year"
                  onClick={() => setPickerYear((y) => y + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTH_ABBR.map((m, idx) => {
                  const isCurrent = idx === monthIndex && pickerYear === displayYear;
                  return (
                    <button
                      key={m}
                      onClick={() => selectMonth(idx)}
                      className={cn(
                        "rounded px-2 py-1.5 text-xs font-medium transition-colors",
                        isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary",
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Next month"
            onClick={() => {
              const next = addMonths(monthAnchor, 1);
              usePlanBook.getState().setAnchor(toKey(startOfMonth(next)));
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Show
        </span>
        <button
          onClick={selectAll}
          className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
        >
          All
        </button>
        <button
          onClick={clearAll}
          className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
        >
          None
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        {courses.map((c) => {
          const on = selectedCourseIds.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCourse(c.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all",
                on
                  ? "border-transparent shadow-sm"
                  : "border-border bg-card text-muted-foreground opacity-60 hover:opacity-100",
              )}
              style={
                on
                  ? {
                      backgroundColor: colorTokenSoft(c.color),
                      color: colorToken(c.color),
                    }
                  : undefined
              }
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: colorToken(c.color) }}
              />
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-5 border-b border-border bg-surface/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
          <div key={d} className="px-3 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-5">
          {weeks.flat().map((d) => {
            const dk = toKey(d);
            const inMonth = d.getMonth() === monthIndex;
            const override = overrides[dk];
            return (
              <div
                key={dk}
                onClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("button, [role='dialog']")) return;
                  onOpenOverride(dk);
                }}
                className={cn(
                  "min-h-28 cursor-pointer border-b border-r border-border p-1.5 transition-colors hover:bg-secondary/40",
                  !inMonth && "bg-muted/30 text-muted-foreground",
                )}
              >
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-semibold">{format(d, "d")}</span>
                  {override && (
                    <span className="truncate text-[10px] italic text-muted-foreground">
                      {override.label}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "gap-1",
                    useTwoCol ? "grid grid-cols-2" : "flex flex-col",
                  )}
                >
                  {selectedCourseIds.map((cid) => {
                    const course = courses.find((c) => c.id === cid);
                    if (!course) return null;
                    const n = countFor(cid, dk);
                    if (n === 0 && !inMonth) return null;
                    const dayInstances = instances
                      .filter((i) => i.courseId === cid && i.dayKey === dk)
                      .sort((a, b) => a.order - b.order);
                    return (
                      <DayCoursePopover
                        key={cid}
                        day={d}
                        course={course}
                        instances={dayInstances}
                        tags={tags}
                        count={n}
                        onOpenPlan={() => onOpenPlan(cid, dk)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PopoverDayContent({
  day,
  course,
  instances,
  tags,
  onOpenPlan,
}: {
  day: Date;
  course: { id: string; name: string; color: string };
  instances: Array<{
    id: string;
    title: string;
    color: string;
    tagIds: string[];
  }>;
  tags: Array<{ id: string; name: string }>;
  onOpenPlan: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-bold">{format(day, "EEE, MMM d")}</div>
        <span
          className="self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: colorTokenSoft(course.color),
            color: colorToken(course.color),
          }}
        >
          {course.name}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-border pt-2">
        {instances.length === 0 ? (
          <div className="text-[11px] italic text-muted-foreground">
            No elements planned
          </div>
        ) : (
          instances.map((inst) => {
            const instTagNames = inst.tagIds
              .map((tid) => tags.find((t) => t.id === tid)?.name)
              .filter((n): n is string => Boolean(n));
            return (
              <div key={inst.id} className="flex items-start gap-1.5 text-[11px]">
                <span
                  className="mt-1 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorToken(inst.color) }}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{inst.title}</span>
                  {instTagNames.length > 0 && (
                    <span className="truncate text-[10px] text-muted-foreground">
                      {instTagNames.join(" · ")}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-border pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-start text-xs"
          onClick={onOpenPlan}
        >
          View lesson plan →
        </Button>
      </div>
    </div>
  );
}
