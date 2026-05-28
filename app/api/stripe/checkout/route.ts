/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session and returns the redirect URL.
 * The client redirects to Stripe's hosted checkout page.
 *
 * Body: { priceId: string, successUrl?: string, cancelUrl?: string }
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createCheckoutSession } from '@/lib/stripe/checkout'
import { getSubscription } from '@/lib/supabase/subscriptions'
import type { ApiError } from '@/types/billing'

export async function POST(req: NextRequest) {
  try {
    // ── Auth check ────────────────────────────────────────────────────────────
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json<ApiError>(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    // ── Parse request ─────────────────────────────────────────────────────────
    const body = await req.json()
    const { priceId, successUrl, cancelUrl } = body

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json<ApiError>(
        { error: 'Missing or invalid priceId', code: 'INVALID_PARAMS' },
        { status: 400 }
      )
    }

    // ── Get existing Stripe customer ID (if any) ───────────────────────────────
    const subscription = await getSubscription()
    const stripeCustomerId = subscription?.stripe_customer_id ?? null

    // ── Create Stripe checkout session ────────────────────────────────────────
    const { url } = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      priceId,
      stripeCustomerId,
      successUrl,
      cancelUrl,
    })

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/stripe/checkout] Error:', message)
    return NextResponse.json<ApiError>(
      { error: 'Failed to create checkout session', code: 'STRIPE_ERROR' },
      { status: 500 }
    )
  }
}
