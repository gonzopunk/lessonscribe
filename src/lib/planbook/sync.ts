import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Snapshot payload — opaque JSON blob serialized from the zustand store.
type Snapshot = Record<string, any>;

export const loadSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ data: Snapshot; updatedAt: string } | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("plan_snapshots")
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data
      ? { data: data.data as Snapshot, updatedAt: data.updated_at as string }
      : null;
  });

export const saveSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.record(z.any()).parse(input))
  .handler(async ({ data, context }) => {
    const snapshot = data as Snapshot;
    const { supabase, userId } = context;

    // Guard 1 — Size cap
    const serialized = JSON.stringify(snapshot);
    const sizeBytes = new TextEncoder().encode(serialized).length;
    if (sizeBytes > 5 * 1024 * 1024) {
      console.error("[saveSnapshot] Snapshot too large:", sizeBytes, "bytes");
      throw new Error("Snapshot too large to save — please contact support if this persists.");
    }

    // Guard 2 — Basic shape validation
    if (
      typeof snapshot !== "object" ||
      snapshot === null ||
      !Array.isArray(snapshot.courses) ||
      !Array.isArray(snapshot.instances) ||
      typeof snapshot.settings !== "object" ||
      snapshot.settings === null
    ) {
      throw new Error("Snapshot shape invalid — data may be corrupted.");
    }

    // Read the current row so we can roll the existing `data` into
    // `previous_data` — gives users a one-step cloud undo if a save
    // overwrites their real plan.
    const { data: current, error: readErr } = await supabase
      .from("plan_snapshots")
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);

    const now = new Date().toISOString();
    const row = {
      user_id: userId,
      data: snapshot,
      updated_at: now,
      ...(current
        ? {
            previous_data: current.data,
            previous_updated_at: current.updated_at,
          }
        : {}),
    };
    const { error } = await supabase
      .from("plan_snapshots")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSnapshotMeta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ hasPrevious: boolean; previousUpdatedAt: string | null }> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("plan_snapshots")
      .select("previous_data, previous_updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      hasPrevious: !!(data && data.previous_data),
      previousUpdatedAt: (data?.previous_updated_at as string | null) ?? null,
    };
  });

export const restorePreviousSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ data: Snapshot; updatedAt: string } | null> => {
    const { supabase, userId } = context;
    const { data: current, error: readErr } = await supabase
      .from("plan_snapshots")
      .select("data, updated_at, previous_data, previous_updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current || !current.previous_data) return null;

    const now = new Date().toISOString();
    // Swap: previous becomes current, current becomes previous (so the
    // restore itself is undoable once).
    const { error } = await supabase
      .from("plan_snapshots")
      .upsert(
        {
          user_id: userId,
          data: current.previous_data,
          updated_at: now,
          previous_data: current.data,
          previous_updated_at: current.updated_at,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { data: current.previous_data as Snapshot, updatedAt: now };
  });

const DAILY_KEEP = 7;

export const saveDailySnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ data: z.record(z.any()), dayKey: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: snapshot, dayKey } = data;

    const { error: insertErr } = await supabase
      .from("plan_snapshot_dailies")
      .upsert(
        { user_id: userId, day_key: dayKey, data: snapshot },
        { onConflict: "user_id,day_key", ignoreDuplicates: true },
      );
    if (insertErr) throw new Error(insertErr.message);

    // Prune beyond the most recent DAILY_KEEP rows.
    const { data: all, error: listErr } = await supabase
      .from("plan_snapshot_dailies")
      .select("id, archived_at")
      .eq("user_id", userId)
      .order("archived_at", { ascending: false });
    if (listErr) throw new Error(listErr.message);
    if (all && all.length > DAILY_KEEP) {
      const stale = all.slice(DAILY_KEEP).map((r) => r.id as string);
      if (stale.length) {
        const { error: delErr } = await supabase
          .from("plan_snapshot_dailies")
          .delete()
          .in("id", stale);
        if (delErr) throw new Error(delErr.message);
      }
    }
    return { ok: true };
  });

export const listDailySnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Array<{ dayKey: string; archivedAt: string }>> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("plan_snapshot_dailies")
      .select("day_key, archived_at")
      .eq("user_id", userId)
      .order("archived_at", { ascending: false })
      .limit(DAILY_KEEP);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      dayKey: r.day_key as string,
      archivedAt: r.archived_at as string,
    }));
  });

export const restoreFromDailySnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ dayKey: z.string().min(1) }).parse(input))
  .handler(
    async ({ data, context }): Promise<{ data: Snapshot; updatedAt: string } | null> => {
      const { supabase, userId } = context;
      const { dayKey } = data;

      const { data: daily, error: dailyErr } = await supabase
        .from("plan_snapshot_dailies")
        .select("data")
        .eq("user_id", userId)
        .eq("day_key", dayKey)
        .maybeSingle();
      if (dailyErr) throw new Error(dailyErr.message);
      if (!daily) return null;

      const { data: current, error: readErr } = await supabase
        .from("plan_snapshots")
        .select("data, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (readErr) throw new Error(readErr.message);

      const now = new Date().toISOString();
      const row = {
        user_id: userId,
        data: daily.data,
        updated_at: now,
        ...(current
          ? { previous_data: current.data, previous_updated_at: current.updated_at }
          : {}),
      };
      const { error } = await supabase
        .from("plan_snapshots")
        .upsert(row, { onConflict: "user_id" });
      if (error) throw new Error(error.message);
      return { data: daily.data as Snapshot, updatedAt: now };
    },
  );
