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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlanBook } from "@/lib/planbook/store";
import { APP_NAME } from "@/lib/planbook/constants";
import { ColorPicker } from "./ColorPicker";
import { seedWeeklyAgendaPreset } from "@/lib/planbook/presets";


export function OnboardingDialog({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss?: () => void;
}) {
  const completeOnboarding = usePlanBook((s) => s.completeOnboarding);
  const [step, setStep] = useState<"course" | "preset">("course");
  const [start, setStart] = useState(() => `${new Date().getFullYear()}-08-15`);
  const [end, setEnd] = useState(() => `${new Date().getFullYear() + 1}-06-15`);
  const [ical, setIcal] = useState("");
  const [name, setName] = useState("10th Grade ELA");
  const [color, setColor] = useState<string>("indigo");
  const [s1, setS1] = useState("Period 1");
  const [s2, setS2] = useState("Period 2");
  const [s3, setS3] = useState("Period 3");
  const [reg, setReg] = useState(50);
  const [wed, setWed] = useState(40);
  const [subs, setSubs] = useState(
    "Seating chart in red folder on desk. Bathroom: one student at a time, sign out on whiteboard. Class roster + emergency procedures in blue binder.",
  );

  const handleOpenChange = (v: boolean) => {
    if (v) return;
    if (step === "preset") return; // disable close during preset step
    onDismiss?.();
  };

  if (step === "preset") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-lg"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Your worksheet is ready to set up</DialogTitle>
            <DialogDescription>
              We've prepared a "Weekly Agenda with Word of the Day" template that fills
              in automatically from your lesson plan — no setup required after this step.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 py-2 text-sm">
            <li>• Three lesson tags: Word of the Day, Main Activity, Exit Ticket</li>
            <li>• Two element templates pre-tagged and ready to drag into your planner</li>
            <li>• A worksheet template with all fields pre-mapped — generates in one click</li>
          </ul>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onDismiss?.()}>
              Skip for now
            </Button>
            <Button
              onClick={() => {
                const cid = usePlanBook.getState().activeCourseId;
                if (cid) seedWeeklyAgendaPreset(cid);
                onDismiss?.();
              }}
            >
              Set it up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome to {APP_NAME}</DialogTitle>
          <DialogDescription>
            A calm lesson planner. Set your school year and create your first course — you can
            change anything later in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              School year
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ob-start">Start</Label>
                <Input
                  id="ob-start"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-end">End</Label>
                <Input
                  id="ob-end"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-ical">District iCal URL (optional)</Label>
              <Input
                id="ob-ical"
                value={ical}
                onChange={(e) => setIcal(e.target.value)}
                placeholder="https://…/calendar.ics"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              First course
            </h3>
            <div className="space-y-1.5">
              <Label htmlFor="ob-name">Course name</Label>
              <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                [s1, setS1, "Section 1"],
                [s2, setS2, "Section 2"],
                [s3, setS3, "Section 3"],
              ].map(([v, setV, lbl], idx) => (
                <div key={idx} className="space-y-1.5">
                  <Label>{lbl as string}</Label>
                  <Input
                    value={v as string}
                    onChange={(e) => (setV as (s: string) => void)(e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Period length (M/T/R/F) — minutes</Label>
                <Input
                  type="number"
                  min={1}
                  value={reg}
                  onChange={(e) => setReg(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Wednesday length — minutes</Label>
                <Input
                  type="number"
                  min={1}
                  value={wed}
                  onChange={(e) => setWed(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-subs">Sub plan defaults (class management context)</Label>
              <Textarea
                id="ob-subs"
                rows={3}
                value={subs}
                onChange={(e) => setSubs(e.target.value)}
              />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              completeOnboarding({
                schoolYearStart: start,
                schoolYearEnd: end,
                icalUrl: ical,
                course: {
                  name,
                  color,
                  sections: [
                    { id: crypto.randomUUID(), name: s1 },
                    { id: crypto.randomUUID(), name: s2 },
                    { id: crypto.randomUUID(), name: s3 },
                  ],
                  periodMinutes: reg,
                  wednesdayMinutes: wed,
                  subDefaults: subs,
                },
              });
              setStep("preset");
            }}
            disabled={!name || !start || !end}
          >
            Start planning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
