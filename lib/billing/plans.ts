/**
 * Plan Configuration
 *
 * This is the ONE file you edit to configure your billing tiers.
 * Set your Stripe Price IDs in .env.local, then customize feature
 * limits and display names here.
 *
 * IMPORTANT: Price IDs come from Stripe Dashboard → Products.
 * Each price must be a recurring subscription price (not one-time).
 */

import type { PlanConfig, PlanTier } from '@/types/billing'

// ─── Plan Definitions ─────────────────────────────────────────────────────────
// Customize names, prices, and features to match your product.
// The `limits` object is used by gates.ts to enforce usage caps.

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started at no cost',
    monthlyPriceId: null,
    yearlyPriceId: null,
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      { name: 'Up to 3 projects', included: true, limit: 3 },
      { name: '1 team member', included: true, limit: 1 },
      { name: 'Basic analytics', included: true },
      { name: 'API access', included: false },
      { name: 'Priority support', included: false },
      { name: 'Custom domain', included: false },
    ],
    limits: {
      projects: 3,
      teamMembers: 1,
      apiCallsPerMonth: 0,
    },
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams and projects',
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? null,
    price: {
      monthly: 19,
      yearly: 15, // per month when billed annually
    },
    popular: true,
    features: [
      { name: 'Unlimited projects', included: true, limit: 'unlimited' },
      { name: 'Up to 5 team members', included: true, limit: 5 },
      { name: 'Advanced analytics', included: true },
      { name: 'API access', included: true },
      { name: 'Priority support', included: true },
      { name: 'Custom domain', included: false },
    ],
    limits: {
      projects: 'unlimited',
      teamMembers: 5,
      apiCallsPerMonth: 50_000,
    },
  },

  team: {
    id: 'team',
    name: 'Team',
    description: 'For larger organizations',
    monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ?? null,
    yearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID ?? null,
    price: {
      monthly: 49,
      yearly: 39, // per month when billed annually
    },
    features: [
      { name: 'Unlimited projects', included: true, limit: 'unlimited' },
      { name: 'Unlimited team members', included: true, limit: 'unlimited' },
      { name: 'Advanced analytics', included: true },
      { name: 'API access', included: true },
      { name: 'Priority support', included: true },
      { name: 'Custom domain', included: true },
    ],
    limits: {
      projects: 'unlimited',
      teamMembers: 'unlimited',
      apiCallsPerMonth: 'unlimited',
    },
  },
}

// ─── Plan Ordering ────────────────────────────────────────────────────────────
// Controls display order in PricingTable component.

export const PLAN_ORDER: PlanTier[] = ['free', 'pro', 'team']

// ─── Helper: Get plan config ──────────────────────────────────────────────────

export function getPlan(tier: PlanTier): PlanConfig {
  return PLANS[tier]
}

// ─── Helper: Resolve plan from Stripe Price ID ───────────────────────────────

export function getPlanFromPriceId(priceId: string): PlanTier | null {
  for (const [tier, plan] of Object.entries(PLANS)) {
    if (plan.monthlyPriceId === priceId || plan.yearlyPriceId === priceId) {
      return tier as PlanTier
    }
  }
  return null
}

// ─── Helper: Is an upgrade? ───────────────────────────────────────────────────

export function isUpgrade(from: PlanTier, to: PlanTier): boolean {
  return PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from)
}

// ─── Helper: All paid price IDs (useful for webhook validation) ───────────────

export function getAllPriceIds(): string[] {
  return Object.values(PLANS)
    .flatMap((p) => [p.monthlyPriceId, p.yearlyPriceId])
    .filter((id): id is string => id !== null)
}
