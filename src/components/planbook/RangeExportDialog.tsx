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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { usePlanBook, getDayMeta } from "@/lib/planbook/store";
import { dayKey as toKey } from "@/lib/planbook/dates";
import { addDays, format } from "date-fns";
import { colorToHex } from "@/lib/planbook/constants";
import { PLAN_PRINT_STYLES, renderPlanHTML } from "@/lib/planbook/printPlan";
import { Printer } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RangeExportDialog({ open, onOpenChange }: Props) {
  const state = usePlanBook();
  const courses = state.courses;
  const monthCourseIds = state.settings.monthCourseIds;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [from, setFrom] = useState(format(monthStart, "yyyy-MM-dd"));
  const [to, setTo] = useState(format(monthEnd, "yyyy-MM-dd"));
  const [pickedCourses, setPickedCourses] = useState<string[]>(
    monthCourseIds.length ? monthCourseIds : courses.map((c) => c.id),
  );
  const [mode, setMode] = useState<"lesson" | "sub">("lesson");
  const [compact, setCompact] = useState(false);
  const [includeEmpty, setIncludeEmpty] = useState(false);

  const toggleCourse = (id: string) =>
    setPickedCourses((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const exportNow = () => {
    const start = new Date(from);
    const end = new Date(to);
    if (end < start) return;
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(toKey(d));

    const sections: string[] = [];
    let first = true;
    const primaryHex =
      pickedCourses.length > 0
        ? colorToHex(
            courses.find((c) => c.id === pickedCourses[0])?.color ?? "indigo",
          )
        : "#2563eb";

    for (const cid of pickedCourses) {
      const course = courses.find((c) => c.id === cid);
      if (!course) continue;
      for (const dk of days) {
        const instances = state.instances
          .filter((i) => i.courseId === cid && i.dayKey === dk)
          .sort((a, b) => a.order - b.order);
        if (!includeEmpty && instances.length === 0) continue;
        const meta = getDayMeta(state, cid, dk);
        const html = renderPlanHTML({
          course,
          dayKey: dk,
          meta,
          instances,
          allTags: state.tags,
          mode,
          compact,
        });
        sections.push(
          `<div class="${first ? "" : "page-break"}">${html}</div>`,
        );
        first = false;
      }
    }

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const title = `${mode === "sub" ? "Sub" : "Lesson"} Plans · ${from} → ${to}`;
    w.document.write(
      `<!doctype html><html><head><title>${title}</title><style>${PLAN_PRINT_STYLES(primaryHex)}</style></head><body>${sections.join("") || "<p>No plans in range.</p>"}</body></html>`,
    );
    w.document.close();
    setTimeout(() => w.print(), 200);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export range</DialogTitle>
          <DialogDescription>
            Print or save a PDF spanning multiple days and courses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rng-from">From</Label>
              <Input
                id="rng-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rng-to">To</Label>
              <Input
                id="rng-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Courses</Label>
            <div className="space-y-1 rounded-md border border-border p-2">
              {courses.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-secondary"
                >
                  <Checkbox
                    checked={pickedCourses.includes(c.id)}
                    onCheckedChange={() => toggleCourse(c.id)}
                  />
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: colorToHex(c.color) }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Toggle
              size="sm"
              pressed={mode === "sub"}
              onPressedChange={(v) => setMode(v ? "sub" : "lesson")}
            >
              {mode === "sub" ? "Sub plan" : "Lesson plan"}
            </Toggle>
            <Toggle size="sm" pressed={compact} onPressedChange={setCompact}>
              {compact ? "Compact" : "Detailed"}
            </Toggle>
            <Toggle size="sm" pressed={includeEmpty} onPressedChange={setIncludeEmpty}>
              {includeEmpty ? "Include empty" : "Skip empty"}
            </Toggle>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={exportNow} disabled={pickedCourses.length === 0}>
            <Printer className="mr-1 size-4" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
