CREATE TABLE public.plan_snapshot_dailies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  day_key text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_key)
);

CREATE INDEX plan_snapshot_dailies_user_archived_idx
  ON public.plan_snapshot_dailies (user_id, archived_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_snapshot_dailies TO authenticated;
GRANT ALL ON public.plan_snapshot_dailies TO service_role;

ALTER TABLE public.plan_snapshot_dailies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily snapshots"
  ON public.plan_snapshot_dailies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily snapshots"
  ON public.plan_snapshot_dailies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily snapshots"
  ON public.plan_snapshot_dailies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily snapshots"
  ON public.plan_snapshot_dailies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);