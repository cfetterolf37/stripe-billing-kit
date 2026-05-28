-- ============================================================
-- Migration: 002_rls_policies
-- Enables Row Level Security on the subscriptions table.
--
-- Run AFTER 001_subscriptions.sql
-- ============================================================

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ─── Policies ─────────────────────────────────────────────────────────────────

-- Users can read ONLY their own subscription row.
CREATE POLICY "users_read_own_subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own row (e.g., on first login/signup).
-- Webhook handlers use the service role key which bypasses RLS entirely.
CREATE POLICY "users_insert_own_subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users CANNOT update their own subscription directly.
-- All updates come through webhook handlers using the service role key.
-- This prevents users from manually setting plan = 'team' in the browser console.

-- Users CANNOT delete their own subscription row.
-- Deletion is handled via cascade when the auth.users row is deleted.

-- ─── Service Role Bypass ──────────────────────────────────────────────────────
-- The Supabase service role key bypasses RLS automatically.
-- Webhook handlers use createServiceClient() which uses this key.
-- No additional policy is needed for service role access.

-- ─── Verify Policies ─────────────────────────────────────────────────────────
-- After running this migration, verify with:
--
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
--   FROM pg_policies
--   WHERE tablename = 'subscriptions';
--
-- You should see two policies: users_read_own_subscription and users_insert_own_subscription.
