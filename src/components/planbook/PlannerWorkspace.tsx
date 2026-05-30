import { useMemo, useState } from "react";
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
import { FilterBar } from "./FilterBar";
import { ElementBank } from "./ElementBank";
import { DayCell } from "./DayCell";
import { PlanModal } from "./PlanModal";
import { MonthView } from "./MonthView";
import { CalendarOverrideDialog } from "./CalendarOverrideDialog";
import { DuplicateDayDialog } from "./DuplicateDayDialog";
import { OnboardingDialog } from "./OnboardingDialog";
import { QuickAddDialog } from "./QuickAddDialog";
import { usePlanBook } from "@/lib/planbook/store";
import {
  dayKey as toKey,
  mondayOf,
  weeksFrom,
  formatWeekRange,
} from "@/lib/planbook/dates";
import { cn } from "@/lib/utils";
import { colorToken, colorTokenSoft } from "@/lib/planbook/constants";

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

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggingTemplateId, setDraggingTemplateId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const monday = useMemo(() => mondayOf(new Date(anchor)), [anchor]);
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

  if (!onboarded || !course) {
    return <OnboardingDialog open={true} />;
  }

  const activeTemplate = draggingTemplateId
    ? templates.find((t) => t.id === draggingTemplateId)
    : null;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header />
      <FilterBar />

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
                return (
                  <div key={wi} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Week of {formatWeekRange(wkMonday)}
                      </h2>
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
    </div>
  );
}

export const _cn = cn;
