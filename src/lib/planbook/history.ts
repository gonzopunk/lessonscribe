// Lightweight undo/redo for the planner store.
//
// Snapshots the persisted shape of the zustand store on a debounce, keeps
// a bounded history, and exposes undo / redo / reset. Cloud sync calls
// resetHistory() after hydrating from the server so a remote load never
// becomes an "undo target".

import { usePlanBook, type Store } from "./store";
import type { PlanBookState } from "./types";

type Snapshot = Partial<PlanBookState>;

const MAX = 50;
const DEBOUNCE_MS = 500;

let undoStack: Snapshot[] = [];
let redoStack: Snapshot[] = [];
let last: Snapshot | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false;
let initialized = false;

const listeners = new Set<() => void>();

function pick(s: Store): Snapshot {
  return {
    version: s.version,
    onboarded: s.onboarded,
    settings: s.settings,
    courses: s.courses,
    activeCourseId: s.activeCourseId,
    tags: s.tags,
    templates: s.templates,
    instances: s.instances,
    overrides: s.overrides,
    dayMeta: s.dayMeta,
    worksheetTemplates: s.worksheetTemplates,
    weekMeta: s.weekMeta,
  };
}

function hasChanges(a: Snapshot, b: Snapshot): boolean {
  return (
    a.instances !== b.instances ||
    a.dayMeta !== b.dayMeta ||
    a.weekMeta !== b.weekMeta ||
    a.courses !== b.courses ||
    a.tags !== b.tags ||
    a.templates !== b.templates ||
    a.overrides !== b.overrides ||
    a.worksheetTemplates !== b.worksheetTemplates ||
    a.settings !== b.settings
  );
}

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeHistory(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function canUndo(): boolean {
  return undoStack.length > 0;
}
export function canRedo(): boolean {
  return redoStack.length > 0;
}

function apply(snap: Snapshot) {
  applying = true;
  usePlanBook.setState((cur) => ({ ...cur, ...snap }));
  last = snap;
  // release on next tick so the store subscription sees `applying`
  setTimeout(() => {
    applying = false;
  }, 0);
}

export function undo() {
  if (!undoStack.length || !last) return;
  const prev = undoStack.pop()!;
  redoStack.push(last);
  apply(prev);
  notify();
}

export function redo() {
  if (!redoStack.length || !last) return;
  const next = redoStack.pop()!;
  undoStack.push(last);
  apply(next);
  notify();
}

export function resetHistory() {
  undoStack = [];
  redoStack = [];
  last = pick(usePlanBook.getState());
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  notify();
}

export function initHistory() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  last = pick(usePlanBook.getState());

  usePlanBook.subscribe(() => {
    if (applying) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const snap = pick(usePlanBook.getState());
      if (last && JSON.stringify(last) === JSON.stringify(snap)) return;
      if (last) {
        undoStack.push(last);
        if (undoStack.length > MAX) undoStack.shift();
      }
      redoStack = [];
      last = snap;
      notify();
    }, DEBOUNCE_MS);
  });

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
      return;
    }
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
      e.preventDefault();
      redo();
    }
  });
}
