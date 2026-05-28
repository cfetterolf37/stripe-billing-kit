/**
 * GET /auth/callback
 *
 * Handles Supabase Auth callbacks:
 * 1. Email confirmation links
 * 2. OAuth provider redirects (if you add social login later)
 *
 * After confirming the session, it:
 * - Creates a Stripe customer for the new user
 * - Inserts a free-tier subscription row in Supabase
 * - Redirects to /dashboard
 *
 * This ensures every user has a billing record from day one.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getOrCreateCustomer } from '@/lib/stripe/portal'
import { ensureSubscriptionRow } from '@/lib/billing/sync'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      try {
        // Initialize billing state for new user.
        // getOrCreateCustomer is idempotent — safe to call on every login.
        const stripeCustomerId = await getOrCreateCustomer(
          data.user.id,
          data.user.email!
        )
        await ensureSubscriptionRow(data.user.id, stripeCustomerId)
      } catch (err) {
        // Non-fatal — billing init failure shouldn't block login.
        console.error('[auth/callback] Billing init failed:', err)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send to login with error param.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
