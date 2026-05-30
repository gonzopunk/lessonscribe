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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanBook } from "@/lib/planbook/store";
import { dayKey as toKey, mondayOf, formatWeekRange } from "@/lib/planbook/dates";
import { addDays } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  sourceMondayKey: string;
}

export function CopyWeekDialog({ open, onOpenChange, courseId, sourceMondayKey }: Props) {
  const duplicateWeek = usePlanBook((s) => s.duplicateWeek);
  const [picked, setPicked] = useState<string[]>([]);

  const sourceMonday = useMemo(() => mondayOf(new Date(sourceMondayKey)), [sourceMondayKey]);

  const candidateWeeks = useMemo(() => {
    // Offer prev 4 and next 8 weeks (excluding source)
    const out: { key: string; label: string }[] = [];
    for (let i = -4; i <= 8; i++) {
      if (i === 0) continue;
      const m = addDays(sourceMonday, i * 7);
      out.push({ key: toKey(m), label: formatWeekRange(m) });
    }
    return out;
  }, [sourceMonday]);

  const toggle = (k: string) =>
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy week</DialogTitle>
          <DialogDescription>
            Copy every element from Mon–Fri of the week of {formatWeekRange(sourceMonday)} into
            the matching weekdays of one or more target weeks.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto py-1">
          {candidateWeeks.map((w) => (
            <label
              key={w.key}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
            >
              <Checkbox checked={picked.includes(w.key)} onCheckedChange={() => toggle(w.key)} />
              <span>Week of {w.label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={picked.length === 0}
            onClick={() => {
              picked.forEach((dest) =>
                duplicateWeek(courseId, toKey(sourceMonday), dest),
              );
              setPicked([]);
              onOpenChange(false);
            }}
          >
            Copy to {picked.length || 0} week{picked.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
