import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Header } from "./Header";

import { ElementBank } from "./ElementBank";
import { DayCell } from "./DayCell";
import { PlanModal } from "./PlanModal";
import { MonthView } from "./MonthView";
import { CalendarOverrideDialog } from "./CalendarOverrideDialog";
import { DuplicateDayDialog } from "./DuplicateDayDialog";
import { OnboardingDialog } from "./OnboardingDialog";
import { QuickAddDialog } from "./QuickAddDialog";
import { WorksheetGenerateDialog } from "./WorksheetGenerateDialog";
import { usePlanBook } from "@/lib/planbook/store";

import {
  dayKey as toKey,
  mondayOf,
  parseDayKey,
  weeksFrom,
  formatWeekRange,
} from "@/lib/planbook/dates";
import { cn } from "@/lib/utils";
import { colorToken, colorTokenSoft, APP_NAME } from "@/lib/planbook/constants";
import { supabase } from "@/integrations/supabase/client";
import { subscribeSync, initCloudSync, type SyncStatus } from "@/lib/planbook/cloudSync";
import { initHistory } from "@/lib/planbook/history";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, FileDown } from "lucide-react";

export function PlannerWorkspace() {
  const onboarded = usePlanBook((s) => s.onboarded);
  const activeCourseId = usePlanBook((s) => s.activeCourseId);
  const course = usePlanBook((s) => s.courses.find((c) => c.id === activeCourseId));
  const weeksInView = usePlanBook((s) => s.settings.weeksInView);
  const viewMode = usePlanBook((s) => s.settings.viewMode);
  const anchor = usePlanBook((s) => s.anchorDate);
  const templates = usePlanBook((s) => s.templates);
  const instances = usePlanBook((s) => s.instances);
  const addInstanceFromTemplate = usePlanBook((s) => s.addInstanceFromTemplate);
  const addInstanceToMany = usePlanBook((s) => s.addInstanceToMany);
  const moveInstance = usePlanBook((s) => s.moveInstance);
  const reorderInDay = usePlanBook((s) => s.reorderInDay);

  const [bankCollapsed, setBankCollapsed] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const [planModal, setPlanModal] = useState<{
    open: boolean;
    mode: "lesson" | "sub";
    dayKey: string | null;
  }>({ open: false, mode: "lesson", dayKey: null });

  const [overrideDialog, setOverrideDialog] = useState<{ open: boolean; key: string | null }>({
    open: false,
    key: null,
  });

  const [dupDialog, setDupDialog] = useState<{ open: boolean; key: string | null }>({
    open: false,
    key: null,
  });

  const [quickAdd, setQuickAdd] = useState<{ open: boolean; key: string | null }>({
    open: false,
    key: null,
  });

  const [worksheetDialog, setWorksheetDialog] = useState<{
    open: boolean;
    weekMonday: Date | null;
  }>({ open: false, weekMonday: null });

  const courseHasTemplates = usePlanBook((s) =>
    s.worksheetTemplates.some((t) => t.courseId === activeCourseId),
  );



  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggingTemplateId, setDraggingTemplateId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const monday = useMemo(() => mondayOf(parseDayKey(anchor)), [anchor]);
  const weeks = useMemo(() => weeksFrom(monday, weeksInView), [monday, weeksInView]);

  const onCellClick = (k: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, [role='dialog'], [data-radix-popper-content-wrapper]")) {
      return;
    }
    if (e.shiftKey && lastClicked) {
      const all = weeks.flat().map(toKey);
      const a = all.indexOf(lastClicked);
      const b = all.indexOf(k);
      if (a >= 0 && b >= 0) {
        const range = all.slice(Math.min(a, b), Math.max(a, b) + 1);
        setSelectedDays(range);
        return;
      }
    }
    if (e.metaKey || e.ctrlKey) {
      setSelectedDays((prev) =>
        prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
      );
    } else {
      setSelectedDays((prev) =>
        prev.length === 1 && prev[0] === k ? [] : [k],
      );
    }
    setLastClicked(k);
  };

  const onDragStart = (e: DragStartEvent) => {
    setActiveDragId(String(e.active.id));
    const data = e.active.data.current as { kind?: string; templateId?: string };
    if (data?.kind === "template") setDraggingTemplateId(data.templateId ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    setDraggingTemplateId(null);
    const { active, over } = e;
    if (!over) return;
    const aData = active.data.current as { kind?: string; templateId?: string; instanceId?: string; dayKey?: string };
    const oData = over.data.current as { kind?: string; courseId?: string; dayKey?: string };

    if (aData?.kind === "template" && aData.templateId) {
      let dKey: string | null = null;
      if (oData?.kind === "day" && oData.dayKey) dKey = oData.dayKey;
      else {
        const inst = instances.find((i) => i.id === String(over.id));
        if (inst) dKey = inst.dayKey;
      }
      if (!dKey) return;
      if (selectedDays.length > 1 && selectedDays.includes(dKey)) {
        addInstanceToMany(aData.templateId, selectedDays);
      } else {
        addInstanceFromTemplate(aData.templateId, dKey);
      }
      return;
    }

    if (aData?.kind === "instance" && aData.instanceId) {
      const moving = instances.find((i) => i.id === aData.instanceId);
      if (!moving) return;

      let destKey: string | null = null;
      if (oData?.kind === "day" && oData.dayKey) destKey = oData.dayKey;
      else {
        const overInst = instances.find((i) => i.id === String(over.id));
        if (overInst) destKey = overInst.dayKey;
      }
      if (!destKey) return;

      if (destKey === moving.dayKey) {
        const dayInsts = instances
          .filter((i) => i.courseId === moving.courseId && i.dayKey === destKey)
          .sort((a, b) => a.order - b.order)
          .map((i) => i.id);
        const overId = String(over.id);
        const fromIdx = dayInsts.indexOf(moving.id);
        const toIdx = dayInsts.indexOf(overId);
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          const reordered = arrayMove(dayInsts, fromIdx, toIdx);
          reorderInDay(moving.courseId, destKey, reordered);
        }
      } else {
        const destCount = instances.filter(
          (i) => i.courseId === moving.courseId && i.dayKey === destKey,
        ).length;
        moveInstance(moving.id, destKey, destCount);
      }
    }
  };

  // Auth + sync gate: never show onboarding to a signed-out returning user,
  // and never show it while we're still loading their cloud snapshot.
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [newUserIntent, setNewUserIntent] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("ls:newUser") === "1",
  );

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
      setAuthChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    initCloudSync();
    initHistory();
    return subscribeSync((s) => setSyncStatus(s.status));
  }, []);

  if (!authChecked) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Signed-out: show a welcome card with explicit Sign in vs Get started.
  // Never auto-show onboarding for an anonymous visitor — that path is what
  // overwrites real cloud data when the user later signs in.
  if (!hasSession && !newUserIntent) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to {APP_NAME}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A calm, color-coded lesson planner. Sign in to sync across devices,
            or get started fresh.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/login">
              <Button className="w-full">Sign in to existing account</Button>
            </Link>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                sessionStorage.setItem("ls:newUser", "1");
                setNewUserIntent(true);
              }}
            >
              I'm new — get started
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Returning user? Always sign in first so your saved plans load.
          </p>
        </div>
      </div>
    );
  }

  // Signed-in but cloud snapshot is still loading — don't render the
  // onboarding dialog yet (would race with cloud hydrate).
  if (hasSession && (syncStatus === "loading" || syncStatus === "idle")) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading your plans…
        </div>
      </div>
    );
  }

  if (!onboarded || !course) {
    return (
      <OnboardingDialog
        open={true}
        onDismiss={() => {
          // Dismiss closes the modal cleanly without touching app state.
          // Bounce anonymous "new user" path back to the welcome card so
          // we don't leave them on a blank screen.
          if (!hasSession) {
            sessionStorage.removeItem("ls:newUser");
            setNewUserIntent(false);
          }
        }}
      />
    );
  }

  const activeTemplate = draggingTemplateId
    ? templates.find((t) => t.id === draggingTemplateId)
    : null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />

      {selectedDays.length > 1 && (
        <div className="flex items-center justify-between border-b border-border bg-primary/10 px-5 py-2 text-xs text-foreground">
          <span>
            <span className="font-bold">{selectedDays.length} days selected</span> — drag an
            element here to assign to all
          </span>
          <button
            onClick={() => setSelectedDays([])}
            className="rounded-md px-2 py-1 hover:bg-secondary"
          >
            Clear
          </button>
        </div>
      )}

      {viewMode === "month" ? (
        <MonthView
          monthAnchor={parseDayKey(anchor)}
          onOpenPlan={(cid, dk) => {
            if (cid !== activeCourseId) usePlanBook.getState().setActiveCourse(cid);
            setPlanModal({ open: true, mode: "lesson", dayKey: dk });
          }}
          onOpenOverride={(dk) => setOverrideDialog({ open: true, key: dk })}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <main className="flex min-h-0 flex-1 overflow-hidden">
            <div
              className="flex-1 overflow-auto p-5"
              style={{ gap: "var(--cell-gap)" }}
            >
              <div
                className="grid h-full gap-5"
                style={{
                  gridTemplateColumns: `repeat(${weeksInView}, minmax(220px, 1fr))`,
                }}
              >
                {weeks.map((week, wi) => {
                  const wkMonday = week[0];
                  const isFirst = wi === 0;
                  const isLast = wi === weeks.length - 1;
                  return (
                    <div key={wi} className="flex flex-col gap-3">
                      <div className="group flex items-center justify-between gap-2 border-b border-border pb-2">
                        {isFirst ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0"
                            aria-label="Previous week"
                            onClick={() => usePlanBook.getState().shiftAnchor(-1)}
                          >
                            <ChevronLeft className="size-4" />
                          </Button>
                        ) : (
                          <span className="size-6 shrink-0" />
                        )}
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Week of {formatWeekRange(wkMonday)}
                        </h2>
                        <div className="flex items-center gap-1">
                          {courseHasTemplates && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Generate worksheet"
                              title="Generate worksheet"
                              onClick={() =>
                                setWorksheetDialog({ open: true, weekMonday: wkMonday })
                              }
                            >
                              <FileDown className="size-4" />
                            </Button>
                          )}
                          {isLast ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 shrink-0"
                              aria-label="Next week"
                              onClick={() => usePlanBook.getState().shiftAnchor(1)}
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                          ) : (
                            <span className="size-6 shrink-0" />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-3">
                        {week.map((d) => {
                          const k = toKey(d);
                          return (
                            <DayCell
                              key={k}
                              date={d}
                              course={course}
                              selected={selectedDays.includes(k)}
                              onSelectClick={(e) => onCellClick(k, e)}
                              onOpenLessonPlan={() =>
                                setPlanModal({ open: true, mode: "lesson", dayKey: k })
                              }
                              onOpenSubPlan={() =>
                                setPlanModal({ open: true, mode: "sub", dayKey: k })
                              }
                              onOpenOverride={() =>
                                setOverrideDialog({ open: true, key: k })
                              }
                              onDuplicate={() => setDupDialog({ open: true, key: k })}
                              onQuickAdd={() => setQuickAdd({ open: true, key: k })}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ElementBank
              collapsed={bankCollapsed}
              onToggle={() => setBankCollapsed((v) => !v)}
            />
          </main>

          <DragOverlay>
            {activeTemplate && (
              <div
                className="rounded-md border bg-card p-2 text-xs font-semibold shadow-lg"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: colorToken(activeTemplate.color),
                  backgroundColor: colorTokenSoft(activeTemplate.color),
                }}
              >
                {activeTemplate.title}
              </div>
            )}
            {activeDragId && !activeTemplate && (
              <div className="rounded-md border border-border bg-card p-2 text-xs shadow-lg">
                Moving…
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <PlanModal
        open={planModal.open}
        onOpenChange={(v) => setPlanModal((p) => ({ ...p, open: v }))}
        courseId={course.id}
        dayKey={planModal.dayKey}
        mode={planModal.mode}
      />
      <CalendarOverrideDialog
        open={overrideDialog.open}
        onOpenChange={(v) => setOverrideDialog((p) => ({ ...p, open: v }))}
        dayKey={overrideDialog.key}
      />
      {dupDialog.key && (
        <DuplicateDayDialog
          open={dupDialog.open}
          onOpenChange={(v) => setDupDialog((p) => ({ ...p, open: v }))}
          courseId={course.id}
          sourceDay={dupDialog.key}
        />
      )}
      <QuickAddDialog
        open={quickAdd.open}
        onOpenChange={(v) => setQuickAdd((p) => ({ ...p, open: v }))}
        courseId={course.id}
        dayKey={quickAdd.key}
      />
      {worksheetDialog.weekMonday && (
        <WorksheetGenerateDialog
          open={worksheetDialog.open}
          onOpenChange={(v) => setWorksheetDialog((p) => ({ ...p, open: v }))}
          courseId={activeCourseId!}
          weekMonday={worksheetDialog.weekMonday}
        />
      )}
    </div>
  );
}


export const _cn = cn;
