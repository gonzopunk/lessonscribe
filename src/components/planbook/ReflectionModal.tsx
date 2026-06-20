import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { usePlanBook, getDayMeta } from "@/lib/planbook/store";
import { useDebouncedCallback } from "@/lib/planbook/hooks";
import { formatDayLong, parseDayKey } from "@/lib/planbook/dates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string | null;
  dayKey: string | null;
}

export function ReflectionModal({ open, onOpenChange, courseId, dayKey }: Props) {
  const course = usePlanBook((s) => s.courses.find((c) => c.id === courseId));
  const meta = usePlanBook((s) =>
    courseId && dayKey ? getDayMeta(s, courseId, dayKey) : null,
  );
  const updateDayMeta = usePlanBook((s) => s.updateDayMeta);

  const [value, setValue] = useState(meta?.reflection ?? "");

  // Reseed when the day changes so typing isn't clobbered by other store updates.
  useEffect(() => {
    setValue(meta?.reflection ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, courseId]);

  const debouncedSave = useDebouncedCallback((v: string) => {
    if (courseId && dayKey) updateDayMeta(courseId, dayKey, { reflection: v });
  }, 300);

  if (!course || !dayKey) return null;
  const date = parseDayKey(dayKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reflection — {course.name}</DialogTitle>
          <DialogDescription>{formatDayLong(date)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="refl">Reflection (after teaching)</Label>
          <Textarea
            id="refl"
            rows={8}
            placeholder="What went well? What would you change next time?"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              setValue(v);
              debouncedSave(v);
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="mr-1 size-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
