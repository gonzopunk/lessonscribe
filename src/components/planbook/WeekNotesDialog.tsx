import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePlanBook } from "@/lib/planbook/store";
import { parseDayKey, weekMetaKey } from "@/lib/planbook/dates";
import { blankWeekMeta, type WeekMeta } from "@/lib/planbook/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  weekKey: string;
}

export function WeekNotesDialog({ open, onOpenChange, courseId, weekKey }: Props) {
  const stored = usePlanBook(
    (s) => s.weekMeta[weekMetaKey(courseId, weekKey)],
  );
  const wm = stored ?? blankWeekMeta();
  const course = usePlanBook((s) => s.courses.find((c) => c.id === courseId));
  const updateWeekMeta = usePlanBook((s) => s.updateWeekMeta);

  const label1 = course?.weekMetaLabel1 || "Custom note 1";
  const label2 = course?.weekMetaLabel2 || "Custom note 2";
  const label3 = course?.weekMetaLabel3 || "Custom note 3";
  const label4 = course?.weekMetaLabel4 || "Custom note 4";
  const label5 = course?.weekMetaLabel5 || "Custom note 5";

  const set = (patch: Partial<WeekMeta>) =>
    updateWeekMeta(courseId, weekKey, patch);

  const fields: { key: keyof WeekMeta; label: string }[] = [
    { key: "weeklyObjectives", label: "Weekly objectives" },
    { key: "essentialQuestion", label: "Essential question" },
    { key: "weeklyNotes", label: "Weekly notes" },
    { key: "custom1", label: label1 },
    { key: "custom2", label: label2 },
    { key: "custom3", label: label3 },
    { key: "custom4", label: label4 },
    { key: "custom5", label: label5 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Week of {format(parseDayKey(weekKey), "MMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Textarea
                rows={3}
                value={wm[f.key]}
                onChange={(e) => set({ [f.key]: e.target.value } as Partial<WeekMeta>)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              if (window.confirm("Clear all weekly notes for this week?")) {
                set({
                  weeklyObjectives: "",
                  essentialQuestion: "",
                  weeklyNotes: "",
                  custom1: "",
                  custom2: "",
                  custom3: "",
                  custom4: "",
                  custom5: "",
                });
              }
            }}
          >
            Clear week notes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
