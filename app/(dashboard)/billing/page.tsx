/**
 * /billing page
 *
 * Shows subscription status, pricing table, and billing management.
 * Handles checkout success/cancel redirects from Stripe.
 */

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import { PricingTable } from '@/components/billing/PricingTable'
import {
  SubscriptionStatus,
  ManageBillingButton,
} from '@/components/billing/index'

interface BillingPageProps {
  searchParams: { checkout?: string }
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  const row = await getSubscription()
  const subscription = toSubscriptionState(row)
  const isOnPaidPlan = subscription.plan !== 'free'

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">

      {/* Checkout result banner */}
      {searchParams.checkout === 'success' && (
        <div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          Subscription activated. Welcome aboard!
        </div>
      )}
      {searchParams.checkout === 'canceled' && (
        <div className="mb-8 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          Checkout canceled. No changes were made.
        </div>
      )}

      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and payment details.
        </p>
      </div>

      {/* Current plan summary (only on paid plans) */}
      {isOnPaidPlan && (
        <div className="mb-10 rounded-xl border border-border p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
            Current plan
          </h2>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <Suspense fallback={<div className="h-10 w-48 animate-pulse rounded bg-muted" />}>
              <SubscriptionStatus />
            </Suspense>
            <ManageBillingButton />
          </div>
        </div>
      )}

      {/* Pricing table */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
          {isOnPaidPlan ? 'Change plan' : 'Choose a plan'}
        </h2>
        <Suspense fallback={<PricingTableSkeleton />}>
          <PricingTable />
        </Suspense>
      </div>

    </div>
  )
}

function PricingTableSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-96 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  )
}
