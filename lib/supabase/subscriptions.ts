/**
 * Subscription Queries
 *
 * All database reads for subscription data.
 * These are the only functions that should query the `subscriptions` table.
 *
 * Server-side only. Never call from Client Components.
 * Client-side subscription state comes from the `useSubscription` hook.
 */

import { createServiceClient } from './server'
import { getCurrentUser } from '@/lib/auth'
import type { SubscriptionRow, PlanTier, SubscriptionStatus, SubscriptionState } from '@/types/billing'

// ─── Get Subscription for Current User ───────────────────────────────────────

/**
 * Returns the full subscription row for the authenticated user.
 * Returns null if no subscription row exists (new user, not yet initialized).
 */
export async function getSubscription(): Promise<SubscriptionRow | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no row — expected for new users
    console.error('[subscriptions] getSubscription error:', error)
    return null
  }

  return data as SubscriptionRow
}

// ─── Get Subscription by User ID (service role) ───────────────────────────────

/**
 * For admin/webhook use. Bypasses RLS.
 */
export async function getSubscriptionByUserId(
  userId: string
): Promise<SubscriptionRow | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[subscriptions] getSubscriptionByUserId error:', error)
    return null
  }

  return data as SubscriptionRow
}

// ─── Get Subscription by Stripe Customer ID ───────────────────────────────────

export async function getSubscriptionByCustomerId(
  customerId: string
): Promise<SubscriptionRow | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[subscriptions] getSubscriptionByCustomerId error:', error)
    return null
  }

  return data as SubscriptionRow
}

// ─── Normalize to SubscriptionState ──────────────────────────────────────────

/**
 * Converts a raw DB row into the typed SubscriptionState used by hooks and components.
 * Falls back to safe free-plan defaults if row is null.
 */
export function toSubscriptionState(row: SubscriptionRow | null): SubscriptionState {
  if (!row) {
    return {
      plan: 'free',
      status: null,
      isActive: true,
      isCanceled: false,
      isTrialing: false,
      isPastDue: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      trialEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    }
  }

  const status = row.status as SubscriptionStatus | null

  return {
    plan: row.plan as PlanTier,
    status,
    isActive: status === 'active' || status === 'trialing' || row.plan === 'free',
    isCanceled: status === 'canceled',
    isTrialing: status === 'trialing',
    isPastDue: status === 'past_due',
    cancelAtPeriodEnd: row.cancel_at_period_end,
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    trialEnd: row.trial_end ? new Date(row.trial_end) : null,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
  }
}
