/**
 * /dashboard page
 *
 * Example dashboard showing subscription state and feature gates in action.
 * Replace the content with your actual app — keep the billing patterns as examples.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import { hasFeatureAccess } from '@/lib/billing/gates'
import { getPlan } from '@/lib/billing/plans'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const row = await getSubscription()
  const subscription = toSubscriptionState(row)
  const planConfig = getPlan(subscription.plan)

  // Server-side feature gate example
  const apiAccess = hasFeatureAccess('apiAccess', subscription.plan)
  const customDomain = hasFeatureAccess('customDomain', subscription.plan)

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Dashboard</h1>

      {/* Plan summary card */}
      <div className="rounded-xl border border-border bg-background p-6 mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Current plan
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">{planConfig.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {subscription.isTrialing
                ? `Trial ends ${subscription.trialEnd?.toLocaleDateString()}`
                : subscription.plan === 'free'
                ? 'Free forever'
                : `Renews ${subscription.currentPeriodEnd?.toLocaleDateString()}`}
            </p>
          </div>
          <Link
            href="/billing"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {subscription.plan === 'free' ? 'Upgrade' : 'Manage'}
          </Link>
        </div>
      </div>

      {/* Feature access examples — shows how server-side gates work */}
      <div className="rounded-xl border border-border bg-background p-6 mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
          Feature access
        </p>
        <div className="space-y-3">
          <FeatureRow
            name="API access"
            hasAccess={apiAccess.hasAccess}
            requiredPlan={apiAccess.requiredPlan}
          />
          <FeatureRow
            name="Custom domain"
            hasAccess={customDomain.hasAccess}
            requiredPlan={customDomain.requiredPlan}
          />
        </div>
      </div>

      {/* Example: gated content */}
      {apiAccess.hasAccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-6">
          <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
            API access enabled
          </p>
          <p className="text-sm text-green-700 dark:text-green-400">
            Your API key: <code className="font-mono">sk_live_••••••••</code>
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/50 p-6 text-center">
          <p className="text-sm font-medium mb-1">API access requires the Pro plan</p>
          <p className="text-xs text-muted-foreground mb-4">
            Upgrade to unlock API keys and programmatic access.
          </p>
          <Link
            href="/billing"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View plans
          </Link>
        </div>
      )}
    </div>
  )
}

function FeatureRow({
  name,
  hasAccess,
  requiredPlan,
}: {
  name: string
  hasAccess: boolean
  requiredPlan?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{name}</span>
      {hasAccess ? (
        <span className="text-green-600 dark:text-green-400 font-medium">Enabled</span>
      ) : (
        <span className="text-muted-foreground">
          Requires{' '}
          <span className="capitalize font-medium text-foreground">{requiredPlan}</span>
        </span>
      )}
    </div>
  )
}
