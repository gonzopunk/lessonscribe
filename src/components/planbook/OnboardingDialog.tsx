import { useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
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
import { usePlanBook } from "@/lib/planbook/store";
import { APP_NAME } from "@/lib/planbook/constants";
import { ColorPicker } from "./ColorPicker";

interface CourseDraft {
  key: string;
  name: string;
  color: string;
  sectionCount: number;
  minutes: number;
}

const newCourseDraft = (): CourseDraft => ({
  key: nanoid(8),
  name: "",
  color: "indigo",
  sectionCount: 1,
  minutes: 50,
});

const MAX_COURSES = 6;

export function OnboardingDialog({
  open,
  onDismiss,
}: {
  open: boolean;
  onDismiss?: () => void;
}) {
  const completeOnboarding = usePlanBook((s) => s.completeOnboarding);
  const [step, setStep] = useState<1 | 2>(1);

  const startYear = (() => {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  })();

  const [start, setStart] = useState(`${startYear}-08-15`);
  const [end, setEnd] = useState(`${startYear + 1}-06-15`);
  const [ical, setIcal] = useState("");
  const [courses, setCourses] = useState<CourseDraft[]>(() => [newCourseDraft()]);

  const patchCourse = (key: string, patch: Partial<CourseDraft>) =>
    setCourses((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const canSubmit = courses.length > 0 && courses.every((c) => c.name.trim().length > 0);

  const submit = () => {
    completeOnboarding({
      schoolYearStart: start,
      schoolYearEnd: end,
      icalUrl: ical,
      courses: courses.map((c) => {
        const sectionCount = Math.max(1, Math.min(10, c.sectionCount || 1));
        const minutes = Math.max(1, c.minutes || 50);
        return {
          name: c.name.trim(),
          color: c.color,
          sections: Array.from({ length: sectionCount }, (_, i) => ({
            id: nanoid(8),
            name: `Period ${i + 1}`,
          })),
          dayMinutes: {
            mon: minutes,
            tue: minutes,
            wed: minutes,
            thu: minutes,
            fri: minutes,
          },
          subDefaults: "",
        };
      }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss?.(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to {APP_NAME}</DialogTitle>
              <DialogDescription>
                First, when does your school year run? You can change any of this later in
                Settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
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
            </div>

            <DialogFooter className="items-center gap-3 sm:justify-between">
              <span className="text-xs text-muted-foreground">Step 1 of 2</span>
              <Button onClick={() => setStep(2)} disabled={!start || !end}>
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Your courses</DialogTitle>
              <DialogDescription>
                Add a course for each class you plan separately. Most teachers start with one or
                two.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {courses.map((c) => (
                <div key={c.key} className="relative rounded-xl border border-border bg-card p-4">
                  {courses.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove course"
                      className="absolute right-2 top-2 text-destructive"
                      onClick={() =>
                        setCourses((cs) => cs.filter((x) => x.key !== c.key))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`name-${c.key}`}>Course name</Label>
                      <Input
                        id={`name-${c.key}`}
                        value={c.name}
                        placeholder="e.g. English 9"
                        onChange={(e) => patchCourse(c.key, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Color</Label>
                      <ColorPicker
                        value={c.color}
                        onChange={(v) => patchCourse(c.key, { color: v })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`sections-${c.key}`}>Number of sections</Label>
                      <Input
                        id={`sections-${c.key}`}
                        type="number"
                        min={1}
                        max={10}
                        value={c.sectionCount}
                        onChange={(e) =>
                          patchCourse(c.key, { sectionCount: parseInt(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Sections share one lesson plan, with optional per-section notes.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`minutes-${c.key}`}>Class period length (minutes)</Label>
                      <Input
                        id={`minutes-${c.key}`}
                        type="number"
                        min={1}
                        value={c.minutes}
                        onChange={(e) =>
                          patchCourse(c.key, { minutes: parseInt(e.target.value) || 0 })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        If some days are shorter, you can set each day individually in Settings.
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={courses.length >= MAX_COURSES}
                  onClick={() => setCourses((cs) => [...cs, newCourseDraft()])}
                >
                  <Plus className="size-4" />
                  Add another course
                </Button>
                {courses.length >= MAX_COURSES && (
                  <span className="text-xs text-muted-foreground">Maximum of 6 courses</span>
                )}
              </div>
            </div>

            <DialogFooter className="items-center gap-3 sm:justify-between">
              <span className="text-xs text-muted-foreground">Step 2 of 2</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={submit} disabled={!canSubmit}>
                  Start planning
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
