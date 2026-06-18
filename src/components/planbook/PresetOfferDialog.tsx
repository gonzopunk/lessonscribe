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
import { seedWeeklyAgendaPreset } from "@/lib/planbook/presets";

export function PresetOfferDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onClose()}>
            Skip for now
          </Button>
          <Button
            onClick={() => {
              const cid = usePlanBook.getState().activeCourseId;
              if (cid) seedWeeklyAgendaPreset(cid);
              onClose();
            }}
          >
            Set it up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
