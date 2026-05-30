// Cloud sync controller for the PlanBook zustand store.
//
// When a user is signed in, we treat the cloud as the source of truth:
// - Hydrate the in-memory store from `plan_snapshots` on sign-in.
// - Debounce store changes and push the full state to the server.
// - Surface sync status (idle | saving | saved | error | offline) for the UI.
//
// We deliberately strip a few volatile UI fields so each device keeps its
// own view position (anchor week, active filter chips, weeks/month toggle).

import { supabase } from "@/integrations/supabase/client";
import { usePlanBook, type Store } from "./store";
import { loadSnapshot, saveSnapshot } from "./sync";
import type { PlanBookState } from "./types";

export type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error" | "offline";

type Listener = (s: SyncState) => void;

interface SyncState {
  status: SyncStatus;
  lastSavedAt: number | null;
  error: string | null;
  userId: string | null;
}

const DEBOUNCE_MS = 800;

let state: SyncState = {
  status: "idle",
  lastSavedAt: null,
  error: null,
  userId: null,
};
const listeners = new Set<Listener>();

let unsubStore: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave = false;
let saving = false;
let suppressNextChange = false;

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

/** Strip device-local fields before pushing to the cloud. */
function pickCloudShape(s: Store): Partial<PlanBookState> {
  return {
    version: s.version,
    onboarded: s.onboarded,
    settings: {
      ...s.settings,
      viewMode: s.settings.viewMode, // kept; harmless
    },
    courses: s.courses,
    activeCourseId: s.activeCourseId,
    tags: s.tags,
    templates: s.templates,
    instances: s.instances,
    overrides: s.overrides,
    dayMeta: s.dayMeta,
    // device-local: anchorDate, selectedFilterTagIds intentionally omitted
  };
}

function applyCloudShape(snapshot: Partial<PlanBookState>) {
  // Replace cloud-managed fields, keep device-local fields as-is.
  suppressNextChange = true;
  usePlanBook.setState((cur) => ({
    ...cur,
    ...snapshot,
    // Force-keep these device-local fields:
    anchorDate: cur.anchorDate,
    selectedFilterTagIds: cur.selectedFilterTagIds,
  }));
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
  saving = true;
  setState({ status: "saving", error: null });
  try {
    const snap = pickCloudShape(usePlanBook.getState());
    await saveSnapshot({ data: { data: snap } });
    setState({ status: "saved", lastSavedAt: Date.now(), error: null });
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
      const snap = (remote.data as { data?: Partial<PlanBookState> }).data;
      if (snap) applyCloudShape(snap);
      setState({
        status: "saved",
        lastSavedAt: new Date(remote.updatedAt as string).getTime(),
        error: null,
      });
    } else {
      // First time signing in on this account → seed cloud with a blank state.
      suppressNextChange = true;
      usePlanBook.getState().resetAll();
      attachStoreListener();
      await flushSave();
      attachStoreListener();
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
  setState({
    userId: null,
    status: "idle",
    lastSavedAt: null,
    error: null,
  });
  // Reset to the local persisted state — zustand persist will rehydrate
  // from localStorage on next page load. For now we keep the in-memory
  // state intact so the planner doesn't blank out mid-session.
}

export function manualRetry() {
  if (state.userId) void flushSave();
}

let initialized = false;
export function initCloudSync() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Online/offline transitions.
  window.addEventListener("online", () => {
    if (state.userId && state.status === "offline") void flushSave();
  });
  window.addEventListener("offline", () => {
    if (state.userId) setState({ status: "offline" });
  });

  // Wire to Supabase auth state.
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
