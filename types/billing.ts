/**
 * Billing Types
 * Single source of truth for all billing-related types across the kit.
 * Import from here everywhere — never redeclare these types inline.
 */

// ─── Plan Tiers ──────────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'pro' | 'team'

// ─── Subscription Status ──────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused'
  | 'unpaid'

// ─── Database Row (matches Supabase schema exactly) ───────────────────────────

export interface SubscriptionRow {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  plan: PlanTier
  status: SubscriptionStatus | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
  created_at: string
  updated_at: string
}

// ─── Plan Config (from lib/billing/plans.ts) ──────────────────────────────────

export interface PlanFeature {
  name: string
  included: boolean
  limit?: number | 'unlimited'
}

export interface PlanConfig {
  id: PlanTier
  name: string
  description: string
  monthlyPriceId: string | null
  yearlyPriceId: string | null
  price: {
    monthly: number
    yearly: number
  }
  features: PlanFeature[]
  limits: Record<string, number | 'unlimited'>
  popular?: boolean
}

// ─── Subscription State (used in hooks + components) ─────────────────────────

export interface SubscriptionState {
  plan: PlanTier
  status: SubscriptionStatus | null
  isActive: boolean
  isCanceled: boolean
  isTrialing: boolean
  isPastDue: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
  trialEnd: Date | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

// ─── Feature Access ───────────────────────────────────────────────────────────

// Re-exported from gates.ts where FEATURE_MAP lives — defined once, referenced here.
export type { FeatureKey } from '@/lib/billing/gates'

export interface FeatureAccess {
  hasAccess: boolean
  reason: 'included' | 'upgrade_required' | 'limit_reached' | 'loading'
  requiredPlan?: PlanTier
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  priceId: string
  successUrl?: string
  cancelUrl?: string
  trialDays?: number
  metadata?: Record<string, string>
}

export interface CreateCheckoutResult {
  url: string
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  error: string
  code?: string
}

export type ApiResult<T> = T | ApiError

// ─── Webhook Events ───────────────────────────────────────────────────────────

export type HandledStripeEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.deleted'
