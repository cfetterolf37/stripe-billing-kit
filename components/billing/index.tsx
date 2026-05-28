/**
 * Billing Components
 *
 * SubscriptionStatus  — shows current plan, renewal date, past-due warnings
 * ManageBillingButton — opens Stripe Customer Portal
 * FeatureGate         — conditionally renders children based on plan access
 */

'use client'

import Link from 'next/link'
import { useSubscription } from '@/hooks/useSubscription'
import { useBillingPortal } from '@/hooks/useCheckout'
import { hasFeatureAccess } from '@/lib/billing/gates'
import { getPlan } from '@/lib/billing/plans'
import type { FeatureKey, PlanTier } from '@/types/billing'

// ─── SubscriptionStatus ───────────────────────────────────────────────────────

/**
 * Shows the user's current plan, status badge, and renewal/cancellation info.
 *
 * Usage:
 *   <SubscriptionStatus />
 */
export function SubscriptionStatus() {
  const { plan, status, isTrialing, isPastDue, cancelAtPeriodEnd, currentPeriodEnd, loading } =
    useSubscription()

  if (loading) {
    return <div className="h-16 animate-pulse rounded-lg bg-muted" />
  }

  const planConfig = getPlan(plan)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{planConfig.name} plan</span>
        <StatusBadge plan={plan} status={status} />
      </div>

      {isPastDue && (
        <p className="text-sm text-destructive">
          Payment failed. Update your payment method to keep access.
        </p>
      )}

      {isTrialing && currentPeriodEnd && (
        <p className="text-sm text-muted-foreground">
          Trial ends {formatDate(currentPeriodEnd)}.
        </p>
      )}

      {cancelAtPeriodEnd && currentPeriodEnd && (
        <p className="text-sm text-muted-foreground">
          Access until {formatDate(currentPeriodEnd)}, then reverts to free.
        </p>
      )}

      {!cancelAtPeriodEnd && currentPeriodEnd && plan !== 'free' && !isTrialing && (
        <p className="text-sm text-muted-foreground">
          Renews {formatDate(currentPeriodEnd)}.
        </p>
      )}
    </div>
  )
}

function StatusBadge({ plan, status }: { plan: PlanTier; status: string | null }) {
  if (plan === 'free') {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Free
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
        Active
      </span>
    )
  }
  if (status === 'trialing') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        Trial
      </span>
    )
  }
  if (status === 'past_due') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
        Past due
      </span>
    )
  }
  if (status === 'canceled') {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Canceled
      </span>
    )
  }
  return null
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

// ─── ManageBillingButton ──────────────────────────────────────────────────────

/**
 * Button that opens the Stripe Customer Portal.
 * Shows nothing if the user has no Stripe customer (free tier, never subscribed).
 *
 * Usage:
 *   <ManageBillingButton />
 *   <ManageBillingButton label="Manage subscription" variant="outline" />
 */
interface ManageBillingButtonProps {
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
}

export function ManageBillingButton({
  label = 'Manage billing',
  variant = 'outline',
  className,
}: ManageBillingButtonProps) {
  const { stripeCustomerId } = useSubscription()
  const { openPortal, loading } = useBillingPortal()

  if (!stripeCustomerId) return null

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border hover:bg-muted',
    ghost: 'hover:bg-muted',
  }

  return (
    <button
      onClick={openPortal}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${variantClasses[variant]} ${className ?? ''}`}
    >
      {loading ? (
        <>
          <LoadingSpinner />
          Opening…
        </>
      ) : (
        label
      )}
    </button>
  )
}

function LoadingSpinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ─── FeatureGate ──────────────────────────────────────────────────────────────

/**
 * Conditionally renders children if the user has access to the feature.
 * Shows a fallback (upgrade prompt or null) if they don't.
 *
 * Usage:
 *   <FeatureGate feature="apiAccess">
 *     <ApiKeyPanel />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="customDomain" fallback={<UpgradeBanner />}>
 *     <DomainSettings />
 *   </FeatureGate>
 */
interface FeatureGateProps {
  feature: FeatureKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { plan, loading } = useSubscription()

  if (loading) return null

  const { hasAccess } = hasFeatureAccess(feature, plan)

  if (!hasAccess) return <>{fallback}</>
  return <>{children}</>
}

// ─── UpgradePrompt ────────────────────────────────────────────────────────────

/**
 * Pre-built fallback for FeatureGate — shows a minimal upgrade CTA.
 *
 * Usage:
 *   <FeatureGate feature="apiAccess" fallback={<UpgradePrompt feature="apiAccess" />}>
 *     <ApiKeyPanel />
 *   </FeatureGate>
 */
interface UpgradePromptProps {
  feature: FeatureKey
  className?: string
}

export function UpgradePrompt({ className }: UpgradePromptProps) {
  return (
    <div
      className={`rounded-lg border border-border bg-muted/50 p-6 text-center ${className ?? ''}`}
    >
      <p className="text-sm font-medium mb-1">Upgrade to unlock this feature</p>
      <p className="text-xs text-muted-foreground mb-4">
        This feature is available on a higher plan.
      </p>
      <Link
        href="/billing"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        View plans
      </Link>
    </div>
  )
}
