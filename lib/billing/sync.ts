/**
 * Subscription Sync
 *
 * Keeps Supabase in sync with Stripe subscription data.
 * Called from webhook handlers — never call directly from client code.
 *
 * All writes are upserts so they are safe to replay (idempotent).
 */

import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { getPlanFromPriceId } from '@/lib/billing/plans'
import type { PlanTier, SubscriptionStatus } from '@/types/billing'

// ─── Sync Subscription ────────────────────────────────────────────────────────

/**
 * Upsert a Stripe Subscription into the `subscriptions` table.
 * Safe to call multiple times — always uses the latest Stripe data.
 */
export async function syncSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createServiceClient()

  const item = subscription.items.data[0]
  const priceId = item?.price?.id ?? null
  const plan: PlanTier = priceId ? (getPlanFromPriceId(priceId) ?? 'free') : 'free'
  const status = subscription.status as SubscriptionStatus

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        plan,
        status,
        current_period_start: item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null,
        current_period_end: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_subscription_id' }
    )

  if (error) {
    console.error('[sync] Failed to sync subscription:', subscription.id, error)
    throw new Error(`Supabase upsert failed: ${error.message}`)
  }
}

// ─── Sync on Checkout Completion ─────────────────────────────────────────────

/**
 * Called after checkout.session.completed.
 * Ensures user_id is linked to the Stripe customer.
 */
export async function syncCheckoutSession(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription
): Promise<void> {
  const supabase = createServiceClient()
  const userId = session.metadata?.user_id

  if (!userId) {
    console.error('[sync] No user_id in checkout session metadata:', session.id)
    return
  }

  const item = subscription.items.data[0]
  const priceId = item?.price?.id ?? null
  const plan: PlanTier = priceId ? (getPlanFromPriceId(priceId) ?? 'pro') : 'pro'
  const status = subscription.status as SubscriptionStatus

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        plan,
        status,
        current_period_start: item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null,
        current_period_end: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[sync] Failed to sync checkout session:', session.id, error)
    throw new Error(`Supabase upsert failed: ${error.message}`)
  }
}

// ─── Cancel Subscription ──────────────────────────────────────────────────────

/**
 * Called when customer.subscription.deleted fires.
 * Downgrades user to free plan.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('[sync] Failed to cancel subscription:', subscriptionId, error)
    throw new Error(`Supabase update failed: ${error.message}`)
  }
}

// ─── Ensure Customer Row ──────────────────────────────────────────────────────

/**
 * Ensures a free-tier subscription row exists for a user.
 * Call after signup to initialize billing state.
 */
export async function ensureSubscriptionRow(userId: string, stripeCustomerId: string): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        plan: 'free',
        status: null,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[sync] Failed to ensure subscription row for user:', userId, error)
  }
}
