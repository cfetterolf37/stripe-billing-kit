/**
 * useSubscription
 *
 * Returns the current user's subscription state.
 * Auth-agnostic: fetches the user ID from /api/auth/session,
 * then subscription state from /api/subscription.
 *
 * Subscribes to real-time Supabase changes — filtered to the current user —
 * so the UI updates immediately after a webhook fires (e.g., after checkout).
 *
 * Usage:
 *   const { plan, isActive, isPastDue, currentPeriodEnd, loading } = useSubscription()
 */

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SubscriptionState } from '@/types/billing'

interface UseSubscriptionResult extends SubscriptionState {
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const defaultState: SubscriptionState = {
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

export function useSubscription(): UseSubscriptionResult {
  // Stable Supabase client for real-time only — not used for auth.
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState<SubscriptionState>(defaultState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription')
      if (res.status === 401) {
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error(`Subscription fetch failed: ${res.status}`)
      const data = await res.json()
      setState(data as SubscriptionState)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setup() {
      // Get user ID for scoping the real-time listener.
      const sessionRes = await fetch('/api/auth/session')
      if (!sessionRes.ok) {
        setLoading(false)
        return
      }
      const session = await sessionRes.json()
      const uid: string = session.id
      await fetchSubscription()

      // Filter to the current user's row so one user's webhook doesn't
      // trigger a re-fetch for every other connected client.
      channel = supabase
        .channel(`subscription-${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${uid}`,
          },
          () => { fetchSubscription() }
        )
        .subscribe()
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, fetchSubscription])

  return { ...state, loading, error, refresh: fetchSubscription }
}
