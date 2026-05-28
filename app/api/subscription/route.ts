/**
 * GET /api/subscription
 *
 * Returns the current user's subscription row, or null if none exists.
 * Used by the useSubscription hook so client components are auth-agnostic.
 *
 * Response: SubscriptionRow | null
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import type { ApiError } from '@/types/billing'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json<ApiError>(
      { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  const row = await getSubscription()
  return NextResponse.json(toSubscriptionState(row))
}
