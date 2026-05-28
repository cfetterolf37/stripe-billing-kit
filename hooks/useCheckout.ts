/**
 * useCheckout
 *
 * Initiates a Stripe Checkout session and redirects the user.
 *
 * Usage:
 *   const { startCheckout, loading } = useCheckout()
 *   <button onClick={() => startCheckout(priceId)}>Upgrade</button>
 */

'use client'

import { useState } from 'react'

interface UseCheckoutResult {
  startCheckout: (priceId: string) => Promise<void>
  loading: boolean
  error: string | null
}

export function useCheckout(): UseCheckoutResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(priceId: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to start checkout')
      }

      // Redirect to Stripe's hosted checkout page.
      window.location.href = data.url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed'
      setError(message)
      setLoading(false)
    }
    // Don't setLoading(false) on success — page is navigating away.
  }

  return { startCheckout, loading, error }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * useBillingPortal
 *
 * Opens the Stripe Customer Portal in the current tab.
 *
 * Usage:
 *   const { openPortal, loading } = useBillingPortal()
 *   <button onClick={openPortal}>Manage billing</button>
 */

interface UseBillingPortalResult {
  openPortal: () => Promise<void>
  loading: boolean
  error: string | null
}

export function useBillingPortal(): UseBillingPortalResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to open billing portal')
      }

      window.location.href = data.url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Portal failed'
      setError(message)
      setLoading(false)
    }
  }

  return { openPortal, loading, error }
}
