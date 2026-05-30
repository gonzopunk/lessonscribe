import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Snapshot payload — opaque JSON blob serialized from the zustand store.
// Typed as `any` because TanStack serializer rejects `unknown` and the
// real shape (PlanBookState) is not known to the server.
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
  .inputValidator((input) => z.object({ data: z.record(z.any()) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("plan_snapshots")
      .upsert(
        { user_id: userId, data: data.data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
