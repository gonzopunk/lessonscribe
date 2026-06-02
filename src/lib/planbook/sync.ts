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
      data: data.data,
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
