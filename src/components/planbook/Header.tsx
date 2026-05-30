import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanBook } from "@/lib/planbook/store";
import { APP_NAME, colorToken } from "@/lib/planbook/constants";
import { cn } from "@/lib/utils";
import { dayKey as toKey, formatWeekRange, mondayOf } from "@/lib/planbook/dates";
import { addMonths, format } from "date-fns";
import { CopyWeekDialog } from "./CopyWeekDialog";
import { RangeExportDialog } from "./RangeExportDialog";

export function Header() {
  const courses = usePlanBook((s) => s.courses);
  const activeCourseId = usePlanBook((s) => s.activeCourseId);
  const setActiveCourse = usePlanBook((s) => s.setActiveCourse);
  const weeksInView = usePlanBook((s) => s.settings.weeksInView);
  const viewMode = usePlanBook((s) => s.settings.viewMode);
  const updateSettings = usePlanBook((s) => s.updateSettings);
  const theme = usePlanBook((s) => s.settings.theme);
  const anchor = usePlanBook((s) => s.anchorDate);
  const shiftAnchor = usePlanBook((s) => s.shiftAnchor);
  const setAnchor = usePlanBook((s) => s.setAnchor);

  const [copyOpen, setCopyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const anchorDate = new Date(anchor);
  const lastWeekStart = new Date(anchorDate);
  lastWeekStart.setDate(anchorDate.getDate() + (weeksInView - 1) * 7);

  const monthShift = (months: number) => {
    const next = addMonths(anchorDate, months);
    setAnchor(toKey(mondayOf(next)));
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="flex h-14 items-center justify-between px-5">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-bold tracking-tight">
            {APP_NAME}
          </Link>
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {courses.map((c) => {
              const active = c.id === activeCourseId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCourse(c.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: colorToken(c.color) }}
                  />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous"
              onClick={() =>
                viewMode === "month" ? monthShift(-1) : shiftAnchor(-weeksInView)
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
            <button
              onClick={() => setAnchor(new Date().toISOString().slice(0, 10))}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
            >
              {viewMode === "month"
                ? format(anchorDate, "MMMM yyyy")
                : `${formatWeekRange(anchorDate)} – ${formatWeekRange(lastWeekStart).split(" – ")[1]}`}
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next"
              onClick={() =>
                viewMode === "month" ? monthShift(1) : shiftAnchor(weeksInView)
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              onClick={() => updateSettings({ viewMode: "weeks" })}
              className={cn(
                "px-2.5 py-1.5 text-xs font-semibold transition-colors",
                viewMode === "weeks"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-secondary",
              )}
            >
              Weeks
            </button>
            <button
              onClick={() => updateSettings({ viewMode: "month" })}
              className={cn(
                "px-2.5 py-1.5 text-xs font-semibold transition-colors",
                viewMode === "month"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:bg-secondary",
              )}
            >
              Month
            </button>
          </div>

          {viewMode === "weeks" && (
            <div className="flex overflow-hidden rounded-md border border-border">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => updateSettings({ weeksInView: n as 1 | 2 | 3 | 4 })}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold transition-colors",
                    weeksInView === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {n}W
                </button>
              ))}
            </div>
          )}

          {viewMode === "weeks" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCopyOpen(true)}
              aria-label="Copy week"
            >
              <Copy className="mr-1 size-4" />
              Copy week
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportOpen(true)}
            aria-label="Export range"
          >
            <Printer className="mr-1 size-4" />
            Export
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() =>
              updateSettings({ theme: theme === "dark" ? "light" : "dark" })
            }
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Link to="/settings" aria-label="Open settings">
            <Button variant="ghost" size="icon">
              <Settings className="size-4" />
            </Button>
          </Link>
        </div>
      </div>

      {activeCourseId && (
        <CopyWeekDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          courseId={activeCourseId}
          sourceMondayKey={toKey(mondayOf(anchorDate))}
        />
      )}
      <RangeExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </header>
  );
}
