import { useMemo } from "react";
import { addDays, format, startOfMonth, endOfMonth } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanBook, getDayMeta } from "@/lib/planbook/store";
import { dayKey as toKey, mondayOf } from "@/lib/planbook/dates";
import { colorToken, colorTokenSoft } from "@/lib/planbook/constants";
import { cn } from "@/lib/utils";

interface Props {
  monthAnchor: Date;
  onOpenPlan: (courseId: string, dKey: string) => void;
  onOpenOverride: (dKey: string) => void;
}

export function MonthView({ monthAnchor, onOpenPlan, onOpenOverride }: Props) {
  const courses = usePlanBook((s) => s.courses);
  const monthCourseIds = usePlanBook((s) => s.settings.monthCourseIds);
  const updateSettings = usePlanBook((s) => s.updateSettings);
  const instances = usePlanBook((s) => s.instances);
  const overrides = usePlanBook((s) => s.overrides);

  const selectedCourseIds =
    monthCourseIds.length > 0
      ? monthCourseIds
      : courses.slice(0, 1).map((c) => c.id);

  const weeks = useMemo(() => {
    const start = mondayOf(startOfMonth(monthAnchor));
    const endMonth = endOfMonth(monthAnchor);
    const result: Date[][] = [];
    let cur = start;
    while (cur <= endMonth || result.length < 5) {
      const week: Date[] = [];
      for (let i = 0; i < 5; i++) {
        week.push(addDays(cur, i));
      }
      result.push(week);
      cur = addDays(cur, 7);
      if (result.length >= 6) break;
    }
    return result;
  }, [monthAnchor]);

  const monthIndex = monthAnchor.getMonth();

  const countFor = (cid: string, dk: string) =>
    instances.filter((i) => i.courseId === cid && i.dayKey === dk).length;

  const toggleCourse = (id: string) => {
    const next = selectedCourseIds.includes(id)
      ? selectedCourseIds.filter((x) => x !== id)
      : [...selectedCourseIds, id];
    updateSettings({ monthCourseIds: next });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-2 text-xs">
        <span className="font-bold uppercase tracking-widest text-muted-foreground">
          Show courses
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {selectedCourseIds.length} selected
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="space-y-1">
              {courses.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-secondary"
                >
                  <Checkbox
                    checked={selectedCourseIds.includes(c.id)}
                    onCheckedChange={() => toggleCourse(c.id)}
                  />
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: colorToken(c.color) }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
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
                <div className="space-y-1">
                  {selectedCourseIds.map((cid) => {
                    const course = courses.find((c) => c.id === cid);
                    if (!course) return null;
                    const n = countFor(cid, dk);
                    if (n === 0 && !inMonth) return null;
                    return (
                      <button
                        key={cid}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPlan(cid, dk);
                        }}
                        className="flex w-full items-center justify-between rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80"
                        style={{
                          borderLeft: `3px solid ${colorToken(course.color)}`,
                          backgroundColor: colorTokenSoft(course.color),
                          color: colorToken(course.color),
                        }}
                      >
                        <span className="truncate">{course.name}</span>
                        <span className="ml-1 opacity-70">{n}</span>
                      </button>
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
