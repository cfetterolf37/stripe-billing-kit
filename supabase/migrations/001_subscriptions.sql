-- ============================================================
-- Migration: 001_subscriptions
-- Creates the subscriptions table that mirrors Stripe state.
--
-- Run this BEFORE 002_rls_policies.sql
-- Apply with: supabase db push   OR   supabase migration up
-- ============================================================

-- The subscriptions table holds one row per user.
-- All billing state is written here by webhook handlers.
-- Client code reads from here via RLS-protected queries.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  -- Primary key
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linked Supabase auth user
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_customer_id      TEXT NOT NULL,
  stripe_subscription_id  TEXT,

  -- Billing state
  -- plan matches keys in lib/billing/plans.ts: 'free' | 'pro' | 'team'
  plan                    TEXT NOT NULL DEFAULT 'free',

  -- status mirrors Stripe subscription statuses.
  -- NULL = free tier, never had a paid subscription.
  -- See: https://stripe.com/docs/api/subscriptions/object#subscription_object-status
  status                  TEXT,

  -- Subscription period (NULL for free tier)
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,

  -- Set to true when user cancels but still has access until period end
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Trial end date (NULL if not trialing)
  trial_end               TIMESTAMPTZ,

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Constraints ─────────────────────────────────────────────────────────────

-- One subscription row per user
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

-- One row per Stripe customer
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);

-- One row per Stripe subscription (when active)
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_stripe_subscription_id_key
  UNIQUE (stripe_subscription_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Webhook handlers look up by customer ID constantly
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON public.subscriptions (stripe_customer_id);

-- Webhook handlers look up by subscription ID on updates/deletes
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON public.subscriptions (stripe_subscription_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Enable Realtime ──────────────────────────────────────────────────────────
-- Required for useSubscription hook to receive live updates after webhooks fire.

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
