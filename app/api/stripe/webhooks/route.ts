/**
 * POST /api/stripe/webhooks
 *
 * Receives and processes Stripe webhook events.
 *
 * CRITICAL SETUP:
 * 1. This route must receive the RAW request body — not parsed JSON.
 *    That's why we export `config` disabling the default body parser.
 *
 * 2. Add this URL to Stripe Dashboard → Webhooks:
 *    Production: https://yourdomain.com/api/stripe/webhooks
 *    Development: Use `stripe listen --forward-to localhost:3000/api/stripe/webhooks`
 *
 * 3. Subscribe to these events in the Stripe Dashboard:
 *    - checkout.session.completed
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.payment_succeeded
 *    - invoice.payment_failed
 *    - customer.deleted
 *
 * 4. Copy the webhook signing secret into STRIPE_WEBHOOK_SECRET in .env.local.
 *    Local: starts with whsec_ from `stripe listen` output.
 *    Production: from Stripe Dashboard → Webhooks → your endpoint → Signing secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, handleWebhookEvent } from '@/lib/stripe/webhooks'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    console.warn('[webhook] Request missing stripe-signature header')
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  // Read raw body — must be string, not parsed JSON.
  const payload = await req.text()

  // ── Verify signature ───────────────────────────────────────────────────────
  let event
  try {
    event = await constructWebhookEvent(payload, signature)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[webhook] Signature verification failed:', message)
    // Return 400 — Stripe will retry on 5xx but not 4xx.
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // ── Process event ──────────────────────────────────────────────────────────
  try {
    const handled = await handleWebhookEvent(event)

    if (!handled) {
      // Unhandled event type — return 200 so Stripe stops retrying.
      console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    // Always return 200 after successful processing so Stripe marks it delivered.
    return NextResponse.json({ received: true, type: event.type })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Handler error'
    console.error(`[webhook] Handler failed for ${event.type}:`, message)

    // Return 500 so Stripe retries the event.
    return NextResponse.json(
      { error: 'Webhook handler failed', type: event.type },
      { status: 500 }
    )
  }
}
