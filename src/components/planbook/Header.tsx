import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Settings,
  Sun,
  Moon,
  BookOpen,
  Printer,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanBook } from "@/lib/planbook/store";
import { APP_NAME, colorToken } from "@/lib/planbook/constants";
import { cn } from "@/lib/utils";
import { ExportDialog } from "./ExportDialog";
import { AccountMenu } from "./AccountMenu";
import {
  canUndo,
  canRedo,
  undo,
  redo,
  subscribeHistory,
} from "@/lib/planbook/history";

type Theme = "light" | "dark" | "parchment";
const THEME_CYCLE: Theme[] = ["light", "dark", "parchment"];
const NEXT_THEME_LABEL: Record<Theme, string> = {
  light: "Switch to dark theme",
  dark: "Switch to parchment theme",
  parchment: "Switch to light theme",
};

export function Header() {
  const courses = usePlanBook((s) => s.courses);
  const activeCourseId = usePlanBook((s) => s.activeCourseId);
  const setActiveCourse = usePlanBook((s) => s.setActiveCourse);
  const weeksInView = usePlanBook((s) => s.settings.weeksInView);
  const viewMode = usePlanBook((s) => s.settings.viewMode);
  const updateSettings = usePlanBook((s) => s.updateSettings);
  const theme = usePlanBook((s) => s.settings.theme);

  const exportRequest = usePlanBook((s) => s.exportRequest);
  const openExportDialog = usePlanBook((s) => s.openExportDialog);
  const closeExportDialog = usePlanBook((s) => s.closeExportDialog);
  const [, setHistTick] = useState(0);
  useEffect(() => subscribeHistory(() => setHistTick((n) => n + 1)), []);

  const ThemeIcon = theme === "dark" ? Sun : theme === "light" ? Moon : BookOpen;
  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme as Theme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    updateSettings({ theme: next });
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

          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!canUndo()}
              onClick={() => undo()}
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Redo"
              title="Redo (⌘⇧Z)"
              disabled={!canRedo()}
              onClick={() => redo()}
            >
              <Redo2 className="size-4" />
            </Button>
          </div>

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
            aria-label={NEXT_THEME_LABEL[theme as Theme] ?? "Toggle theme"}
            title={NEXT_THEME_LABEL[theme as Theme] ?? "Toggle theme"}
            onClick={cycleTheme}
          >
            <ThemeIcon className="size-4" />
          </Button>
          <Link to="/settings" aria-label="Open settings">
            <Button variant="ghost" size="icon">
              <Settings className="size-4" />
            </Button>
          </Link>
          <AccountMenu />
        </div>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </header>
  );
}
