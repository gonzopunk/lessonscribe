CREATE TABLE public.plan_snapshots (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_snapshots TO authenticated;
GRANT ALL ON public.plan_snapshots TO service_role;

ALTER TABLE public.plan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshot"
  ON public.plan_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshot"
  ON public.plan_snapshots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshot"
  ON public.plan_snapshots FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshot"
  ON public.plan_snapshots FOR DELETE TO authenticated
  USING (auth.uid() = user_id);