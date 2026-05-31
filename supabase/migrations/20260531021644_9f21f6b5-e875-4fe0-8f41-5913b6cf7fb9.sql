ALTER TABLE public.plan_snapshots
  ADD COLUMN IF NOT EXISTS previous_data jsonb,
  ADD COLUMN IF NOT EXISTS previous_updated_at timestamptz;