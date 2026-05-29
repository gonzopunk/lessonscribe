import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePlanBook } from "@/lib/planbook/store";
import {
  dayKey as toKey,
  formatDayShort,
  mondayOf,
  weeksFrom,
} from "@/lib/planbook/dates";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  sourceDay: string;
}

export function DuplicateDayDialog({ open, onOpenChange, courseId, sourceDay }: Props) {
  const anchor = usePlanBook((s) => s.anchorDate);
  const duplicateDay = usePlanBook((s) => s.duplicateDay);
  const overrides = usePlanBook((s) => s.overrides);
  const [picked, setPicked] = useState<string[]>([]);

  const monday = mondayOf(new Date(anchor));
  const weeks = weeksFrom(monday, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate to…</DialogTitle>
          <DialogDescription>
            Copy all elements from {sourceDay} to selected days.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-1.5 py-2">
          {weeks.flat().map((d) => {
            const k = toKey(d);
            const isSrc = k === sourceDay;
            const isOverride = overrides[k]?.kind === "no_school";
            const on = picked.includes(k);
            return (
              <button
                key={k}
                disabled={isSrc || isOverride}
                onClick={() =>
                  setPicked(on ? picked.filter((x) => x !== k) : [...picked, k])
                }
                className={cn(
                  "rounded border px-1 py-2 text-[10px] font-medium transition-colors",
                  isSrc && "border-primary bg-primary/20 text-primary",
                  isOverride && "opacity-30",
                  on && !isSrc && "border-primary bg-primary text-primary-foreground",
                  !on && !isSrc && !isOverride && "border-border bg-surface hover:bg-secondary",
                )}
              >
                {formatDayShort(d)}
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={picked.length === 0}
            onClick={() => {
              duplicateDay(courseId, sourceDay, picked);
              onOpenChange(false);
              setPicked([]);
            }}
          >
            Duplicate to {picked.length} {picked.length === 1 ? "day" : "days"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
