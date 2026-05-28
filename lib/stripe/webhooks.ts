/**
 * Stripe Webhook Handlers
 *
 * Processes incoming Stripe events and keeps Supabase in sync.
 *
 * SECURITY: Every request is verified using the Stripe webhook signature
 * before any handler runs. Never skip signature verification.
 *
 * IDEMPOTENCY: All handlers use upserts and are safe to replay.
 * Stripe may deliver the same event more than once — that's expected.
 *
 * Handled events:
 *   checkout.session.completed       → link user_id to customer, create subscription row
 *   customer.subscription.created    → sync subscription
 *   customer.subscription.updated    → sync subscription (plan changes, renewals)
 *   customer.subscription.deleted    → downgrade to free
 *   invoice.payment_succeeded        → update period dates
 *   invoice.payment_failed           → set status to past_due
 *   customer.deleted                 → clean up customer ID
 */

import Stripe from 'stripe'
import { stripe } from './client'
import {
  syncSubscription,
  syncCheckoutSession,
  cancelSubscription,
} from '@/lib/billing/sync'

// ─── Signature Verification ───────────────────────────────────────────────────

/**
 * Verifies the Stripe webhook signature and returns the parsed event.
 * Throws if the signature is invalid or the payload is malformed.
 *
 * IMPORTANT: Pass the raw request body (Buffer/string), not parsed JSON.
 * Next.js App Router: use `await req.text()` — do NOT use `await req.json()`.
 */
export async function constructWebhookEvent(
  payload: string,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error(
      'Missing STRIPE_WEBHOOK_SECRET. ' +
      'Run `stripe listen` to get your local secret, or add the production ' +
      'secret from Stripe Dashboard → Webhooks.'
    )
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

// ─── Event Router ─────────────────────────────────────────────────────────────

/**
 * Routes a verified Stripe event to the correct handler.
 * Returns true if the event was handled, false if it was intentionally ignored.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<boolean> {
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(session)
      return true
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      await syncSubscription(subscription)
      return true
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await cancelSubscription(subscription.id)
      return true
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      await handleInvoicePaymentSucceeded(invoice)
      return true
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await handleInvoicePaymentFailed(invoice)
      return true
    }

    case 'customer.deleted': {
      // Optional: handle customer cleanup here if needed.
      console.log('[webhook] customer.deleted — no action taken.')
      return true
    }

    default:
      // Event type not handled — safe to ignore.
      return false
  }
}

// ─── Individual Handlers ──────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.mode !== 'subscription') {
    // One-time payments — not handled by this kit.
    return
  }

  if (!session.subscription) {
    console.error('[webhook] checkout.session.completed has no subscription:', session.id)
    return
  }

  // Retrieve full subscription object (session only has the ID).
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  await syncCheckoutSession(session, subscription)
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  // Retrieve full subscription to get updated period dates.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await syncSubscription(subscription)
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  // syncSubscription will write status: 'past_due' since that's what Stripe sets.
  await syncSubscription(subscription)
}

// In Stripe API 2026-05-27.dahlia, invoice.subscription moved to
// invoice.parent.subscription_details.subscription.
function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent
  if (parent?.type !== 'subscription_details') return null
  const sub = parent.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}
