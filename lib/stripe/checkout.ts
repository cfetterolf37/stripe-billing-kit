/**
 * Stripe Checkout
 *
 * Creates Stripe Checkout sessions for new subscriptions and upgrades.
 * Called from the POST /api/stripe/checkout API route.
 */

import { stripe } from './client'
import type { CreateCheckoutParams, CreateCheckoutResult } from '@/types/billing'

interface CreateSessionOptions extends CreateCheckoutParams {
  userId: string
  userEmail: string
  stripeCustomerId?: string | null
}

// ─── Create Checkout Session ──────────────────────────────────────────────────

export async function createCheckoutSession(
  options: CreateSessionOptions
): Promise<CreateCheckoutResult> {
  const {
    userId,
    userEmail,
    priceId,
    stripeCustomerId,
    successUrl,
    cancelUrl,
    trialDays,
    metadata = {},
  } = options

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',

    // Attach user identity so webhooks know who subscribed.
    // This is how we link Stripe customer → Supabase user.
    metadata: {
      user_id: userId,
      ...metadata,
    },

    subscription_data: {
      metadata: { user_id: userId },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },

    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],

    // Re-use existing customer if one exists; otherwise Stripe creates a new one.
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : {
          customer_email: userEmail,
          customer_creation: 'always',
        }),

    // Allow promo codes on the checkout page.
    allow_promotion_codes: true,

    // Collect billing address (required for tax calculation in some regions).
    billing_address_collection: 'auto',

    // After payment, redirect back to the app.
    success_url: successUrl ?? `${baseUrl}/billing?checkout=success`,
    cancel_url: cancelUrl ?? `${baseUrl}/billing?checkout=canceled`,
  })

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.')
  }

  return { url: session.url }
}

// ─── Create Upgrade/Downgrade Session ────────────────────────────────────────

/**
 * For users who already have a subscription — upgrades or downgrades
 * immediately via Stripe's subscription update API (no new checkout).
 */
export async function updateSubscription(
  stripeSubscriptionId: string,
  newPriceId: string
): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const currentItemId = subscription.items.data[0].id

  await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: currentItemId,
        price: newPriceId,
      },
    ],
    // Apply prorated credit/charge immediately.
    proration_behavior: 'always_invoice',
  })
}
