// Cloud sync controller for the LessonCraft zustand store.
//
// When a user is signed in, the cloud is the source of truth:
// - Hydrate the in-memory store from `plan_snapshots` on sign-in.
// - Debounce store changes and push the full state to the server.
// - Surface sync status (idle | saving | saved | error | offline) for the UI.
// - Refuse to overwrite a non-empty cloud snapshot with an empty local one
//   (prevents the "blank onboarding clobbers real data" race).

import { supabase } from "@/integrations/supabase/client";
import { usePlanBook, type Store } from "./store";
import {
  loadSnapshot,
  saveSnapshot,
  getSnapshotMeta,
  restorePreviousSnapshot,
} from "./sync";
import { resetHistory } from "./history";
import type { PlanBookState } from "./types";

export type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error" | "offline";

type Listener = (s: SyncState) => void;

interface SyncState {
  status: SyncStatus;
  lastSavedAt: number | null;
  error: string | null;
  userId: string | null;
  hasPrevious: boolean;
  previousUpdatedAt: string | null;
}

const DEBOUNCE_MS = 800;

let state: SyncState = {
  status: "idle",
  lastSavedAt: null,
  error: null,
  userId: null,
  hasPrevious: false,
  previousUpdatedAt: null,
};
const listeners = new Set<Listener>();

let unsubStore: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave = false;
let saving = false;
let suppressNextChange = false;
let remoteHasSnapshot = false; // true once we confirm cloud row exists
let hydratedAt = 0;

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
}

export function subscribeSync(l: Listener): () => void {
  listeners.add(l);
  l(state);
  return () => listeners.delete(l);
}

export function getSyncState(): SyncState {
  return state;
}

function isEmptySnapshot(s: Store): boolean {
  return (
    s.courses.length === 0 &&
    s.templates.length === 0 &&
    s.instances.length === 0 &&
    !s.onboarded
  );
}

function pickCloudShape(s: Store): Partial<PlanBookState> {
  return {
    version: s.version,
    onboarded: s.onboarded,
    settings: { ...s.settings },
    courses: s.courses,
    activeCourseId: s.activeCourseId,
    tags: s.tags,
    templates: s.templates,
    instances: s.instances,
    overrides: s.overrides,
    dayMeta: s.dayMeta,
    worksheetTemplates: s.worksheetTemplates,
    weekMeta: s.weekMeta,
    // device-local: anchorDate, selectedFilterTagIds intentionally omitted
  };
}

function snapshotSize(s: Partial<PlanBookState>): number {
  return (
    (s.courses?.length ?? 0) +
    (s.templates?.length ?? 0) +
    (s.instances?.length ?? 0) +
    (s.worksheetTemplates?.length ?? 0)
  );
}

function applyCloudShape(snapshot: Partial<PlanBookState>) {
  suppressNextChange = true;
  usePlanBook.setState((cur) => ({
    ...cur,
    ...snapshot,
    anchorDate: cur.anchorDate,
    selectedFilterTagIds: cur.selectedFilterTagIds,
  }));
  // Hydrating from the cloud should not be undoable.
  resetHistory();
}

async function refreshMeta() {
  try {
    const meta = await getSnapshotMeta();
    setState({
      hasPrevious: meta.hasPrevious,
      previousUpdatedAt: meta.previousUpdatedAt,
    });
  } catch {
    // non-fatal
  }
}

async function flushSave() {
  if (saving) {
    pendingSave = true;
    return;
  }
  if (!state.userId) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setState({ status: "offline", error: null });
    return;
  }

  // Guard: never let an empty (or strictly-smaller) local state overwrite a
  // non-empty cloud snapshot. Safety net for the post-signin clobber race.
  const cur = usePlanBook.getState();
  if (remoteHasSnapshot && (isEmptySnapshot(cur) || Date.now() - hydratedAt < 1500)) {
    try {
      const remote = await loadSnapshot();
      const snap = remote?.data as Partial<PlanBookState> | undefined;
      if (snap) {
        const remoteSize = snapshotSize(snap);
        const localSize = snapshotSize(pickCloudShape(cur));
        if (isEmptySnapshot(cur) || localSize < remoteSize) {
          console.warn("[sync] refusing to overwrite cloud snapshot with smaller local state");
          applyCloudShape(snap);
          setState({ status: "saved", error: null });
          return;
        }
      }
    } catch {
      /* noop */
    }
  }

  saving = true;
  setState({ status: "saving", error: null });
  try {
    const snap = pickCloudShape(usePlanBook.getState());
    await saveSnapshot({ data: snap as Record<string, any> });
    remoteHasSnapshot = true;
    setState({ status: "saved", lastSavedAt: Date.now(), error: null });
    void refreshMeta();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setState({ status: "error", error: msg });
  } finally {
    saving = false;
    if (pendingSave) {
      pendingSave = false;
      scheduleSave();
    }
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, DEBOUNCE_MS);
}

function attachStoreListener() {
  if (unsubStore) return;
  unsubStore = usePlanBook.subscribe(() => {
    if (suppressNextChange) {
      suppressNextChange = false;
      return;
    }
    if (!state.userId) return;
    scheduleSave();
  });
}

function detachStoreListener() {
  if (unsubStore) {
    unsubStore();
    unsubStore = null;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

async function handleSignIn(userId: string) {
  setState({ userId, status: "loading", error: null });
  try {
    const remote = await loadSnapshot();
    if (remote && remote.data) {
      remoteHasSnapshot = true;
      const snap = (remote.data as { data?: Partial<PlanBookState> }).data;
      if (snap) applyCloudShape(snap);
      setState({
        status: "saved",
        lastSavedAt: new Date(remote.updatedAt as string).getTime(),
        error: null,
      });
      void refreshMeta();
    } else {
      // loadSnapshot returned null. This means either:
      // (a) genuinely new user with no cloud snapshot, OR
      // (b) server function failed silently (returns null instead of throwing).
      // Guard: if local state is already onboarded, treat as case (b) and
      // leave local data intact. Only reset if local state is also empty.
      remoteHasSnapshot = false;
      const local = usePlanBook.getState();
      if (!local.onboarded && isEmptySnapshot(local)) {
        // Truly new user — seed cloud with fresh default state.
        suppressNextChange = true;
        local.resetAll();
        attachStoreListener();
        await flushSave();
      } else {
        // Local state exists — server function likely failed in preview.
        // Leave local data intact and sync it up to the cloud.
        attachStoreListener();
        await flushSave();
      }
      return;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setState({ status: "error", error: msg });
  }
  attachStoreListener();
}

function handleSignOut() {
  detachStoreListener();
  remoteHasSnapshot = false;
  setState({
    userId: null,
    status: "idle",
    lastSavedAt: null,
    error: null,
    hasPrevious: false,
    previousUpdatedAt: null,
  });
}

export function manualRetry() {
  if (state.userId) void flushSave();
}

export async function restorePrevious(): Promise<boolean> {
  if (!state.userId) return false;
  try {
    setState({ status: "loading", error: null });
    const restored = await restorePreviousSnapshot();
    if (!restored) {
      setState({ status: "saved", error: null });
      return false;
    }
    const snap = (restored.data as { data?: Partial<PlanBookState> }).data;
    if (snap) applyCloudShape(snap);
    remoteHasSnapshot = true;
    setState({
      status: "saved",
      lastSavedAt: new Date(restored.updatedAt).getTime(),
      error: null,
    });
    void refreshMeta();
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setState({ status: "error", error: msg });
    return false;
  }
}

let initialized = false;
export function initCloudSync() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("online", () => {
    if (state.userId && state.status === "offline") void flushSave();
  });
  window.addEventListener("offline", () => {
    if (state.userId) setState({ status: "offline" });
  });

  void (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await handleSignIn(data.session.user.id);
  })();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
      if (session?.user && session.user.id !== state.userId) {
        void handleSignIn(session.user.id);
      }
    } else if (event === "SIGNED_OUT") {
      handleSignOut();
    }
  });
}
