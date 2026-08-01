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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePlanBook } from "@/lib/planbook/store";
import { seedWeeklyAgendaPreset } from "@/lib/planbook/presets";
import { colorToken } from "@/lib/planbook/constants";

export function PresetOfferDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const courses = usePlanBook((s) => s.courses);
  const [selected, setSelected] = useState<string[]>(() =>
    usePlanBook.getState().courses.map((c) => c.id),
  );
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const confirmLabel =
    courses.length === 1
      ? `Set up for ${courses[0].name}`
      : `Set up for ${selected.length} course${selected.length === 1 ? "" : "s"}`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) return; /* block close */ }}>
      <DialogContent
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Generate student worksheets from your lesson plans</DialogTitle>
          <DialogDescription>
            One-time setup adds the tags and templates you need. After that,
            plan your week as usual and download a completed student handout
            in one click from the week column header.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border border-border">
          <img
            src="/presets/weekly-agenda-preview.png"
            alt="Weekly Agenda and Accountability Tracker preview"
            className="w-full"
          />
        </div>

        <ul className="space-y-2 py-1 text-sm">
          <li>• Two-page weekly handout: activity checklist, Word of the Day, exit tickets, tip of the week, and reflection prompts</li>
          <li>• Five ready-to-use element templates — drag onto any day and they appear on the student sheet automatically</li>
          <li>• Tag any lesson element "Student Agenda" to include it on the student copy; leave the tag off to keep it teacher-facing only</li>
        </ul>

        {courses.length > 1 && (
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-medium">Set up for:</p>
            <div className="mt-2 space-y-2">
              {courses.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`preset-course-${c.id}`}
                    checked={selected.includes(c.id)}
                    onCheckedChange={() => toggle(c.id)}
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorToken(c.color) }}
                  />
                  <Label htmlFor={`preset-course-${c.id}`} className="text-sm font-normal">
                    {c.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onClose()}>
            Skip for now
          </Button>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              selected.forEach((id) => seedWeeklyAgendaPreset(id));
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
