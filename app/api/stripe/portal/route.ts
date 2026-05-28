/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Customer Portal session and returns the redirect URL.
 * Only available to users who have a Stripe customer ID (i.e., paid at least once).
 *
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createPortalSession } from '@/lib/stripe/portal'
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

    // ── Get Stripe customer ID ─────────────────────────────────────────────────
    const subscription = await getSubscription()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json<ApiError>(
        {
          error: 'No billing account found. Subscribe to a plan first.',
          code: 'NO_CUSTOMER',
        },
        { status: 400 }
      )
    }

    // ── Optional: parse return URL from body ──────────────────────────────────
    let returnUrl: string | undefined
    try {
      const body = await req.json()
      returnUrl = body?.returnUrl
    } catch {
      // Body is optional — proceed without it.
    }

    // ── Create portal session ─────────────────────────────────────────────────
    const { url } = await createPortalSession(
      subscription.stripe_customer_id,
      returnUrl
    )

    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/stripe/portal] Error:', message)
    return NextResponse.json<ApiError>(
      { error: 'Failed to create portal session', code: 'STRIPE_ERROR' },
      { status: 500 }
    )
  }
}
