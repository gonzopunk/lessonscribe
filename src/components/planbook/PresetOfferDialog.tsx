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
          <DialogTitle>Your worksheet is ready to set up</DialogTitle>
          <DialogDescription>
            We've prepared a "Weekly Agenda with Word of the Day" template that fills in
            automatically from your lesson plan — no setup required after this step.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2 text-sm">
          <li>• Three lesson tags: Word of the Day, Main Activity, Exit Ticket</li>
          <li>• Two element templates pre-tagged and ready to drag into your planner</li>
          <li>• A worksheet template with all fields pre-mapped</li>
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
