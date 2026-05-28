/**
 * PricingTable
 *
 * Renders plan cards with features, pricing, and upgrade CTAs.
 * Handles billing interval toggle (monthly/yearly) internally.
 * Shows exact annual savings per plan (not just a generic "Save 20%").
 *
 * Usage:
 *   <PricingTable />
 *   <PricingTable onSuccess={() => router.push('/dashboard')} />
 */

'use client'

import { useState } from 'react'
import { PLANS, PLAN_ORDER } from '@/lib/billing/plans'
import { useSubscription } from '@/hooks/useSubscription'
import { useCheckout } from '@/hooks/useCheckout'
import { cn } from '@/lib/utils'
import type { PlanTier } from '@/types/billing'

interface PricingTableProps {
  onSuccess?: () => void
}

export function PricingTable({ onSuccess }: PricingTableProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const { plan: currentPlan, loading: subLoading } = useSubscription()
  const { startCheckout, loading: checkoutLoading } = useCheckout()

  async function handleUpgrade(tier: PlanTier) {
    const planConfig = PLANS[tier]
    const priceId =
      interval === 'yearly' ? planConfig.yearlyPriceId : planConfig.monthlyPriceId
    if (!priceId) return
    await startCheckout(priceId)
    onSuccess?.()
  }

  return (
    <div className="w-full">
      {/* Interval toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center rounded-full border border-border bg-muted p-1 gap-0.5">
          <button
            onClick={() => setInterval('monthly')}
            className={cn(
              'rounded-full px-5 py-1.5 text-sm font-medium transition-all',
              interval === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={cn(
              'flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-medium transition-all',
              interval === 'yearly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Yearly
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLAN_ORDER.map((tier) => {
          const plan = PLANS[tier]
          const isCurrentPlan = tier === currentPlan
          const price = interval === 'yearly' ? plan.price.yearly : plan.price.monthly
          const annualSavings =
            plan.price.monthly > 0
              ? (plan.price.monthly - plan.price.yearly) * 12
              : 0

          return (
            <div
              key={tier}
              className={cn(
                'relative flex flex-col rounded-2xl border p-6 transition-shadow',
                plan.popular
                  ? 'border-primary shadow-lg ring-1 ring-primary'
                  : 'border-border hover:shadow-md'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                  <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                </div>
              )}

              {/* Plan name + description */}
              <div className="mb-5">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <div className="flex items-end gap-1">
                  {price === 0 ? (
                    <span className="text-4xl font-bold tracking-tight">Free</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold tracking-tight">${price}</span>
                      <span className="mb-1 text-sm text-muted-foreground">/ mo</span>
                    </>
                  )}
                </div>
                {interval === 'yearly' && annualSavings > 0 ? (
                  <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
                    ${annualSavings} savings vs monthly
                  </p>
                ) : price > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">billed monthly</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">no credit card required</p>
                )}
              </div>

              {/* Feature list */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.name} className="flex items-start gap-2.5 text-sm">
                    {feature.included ? (
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <MinusIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30" />
                    )}
                    <span
                      className={
                        feature.included ? 'text-foreground' : 'text-muted-foreground/60'
                      }
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground"
                >
                  Current plan
                </button>
              ) : plan.monthlyPriceId || plan.yearlyPriceId ? (
                <button
                  onClick={() => handleUpgrade(tier)}
                  disabled={checkoutLoading || subLoading}
                  className={cn(
                    'w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60',
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border hover:bg-muted'
                  )}
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      Loading…
                    </span>
                  ) : (
                    `Get ${plan.name}`
                  )}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground"
                >
                  Free forever
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  )
}

function Spinner() {
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
