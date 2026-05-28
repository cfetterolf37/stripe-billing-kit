/**
 * Stripe Customer Portal
 *
 * Generates a Stripe Customer Portal session URL.
 * The portal lets users manage their subscription, update payment methods,
 * download invoices, and cancel — all handled by Stripe, not your code.
 *
 * SETUP REQUIRED:
 * Configure your portal at https://dashboard.stripe.com/settings/billing/portal
 * Enable: subscription cancellation, plan switching, invoice history, payment method updates.
 */

import { stripe } from './client'

// ─── Create Portal Session ────────────────────────────────────────────────────

export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl?: string
): Promise<{ url: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl ?? `${baseUrl}/billing`,
  })

  return { url: session.url }
}

// ─── Get or Create Stripe Customer ───────────────────────────────────────────

/**
 * Retrieves an existing Stripe customer or creates a new one.
 * Call during onboarding or first billing action — never in webhook handlers.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // Search for existing customer by metadata first.
  const existing = await stripe.customers.search({
    query: `metadata['user_id']:'${userId}'`,
    limit: 1,
  })

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { user_id: userId },
  })

  return customer.id
}
