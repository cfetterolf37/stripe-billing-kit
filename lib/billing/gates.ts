/**
 * Feature Gates
 *
 * Controls which features are available on each plan.
 * Use `hasFeatureAccess` server-side (API routes, Server Components).
 * Use the `<FeatureGate>` component or `useFeatureAccess` hook client-side.
 *
 * Usage:
 *   // Server
 *   const access = hasFeatureAccess('apiAccess', userPlan)
 *   if (!access.hasAccess) return new Response('Upgrade required', { status: 403 })
 *
 *   // Client
 *   <FeatureGate feature="apiAccess">
 *     <ApiKeyPanel />
 *   </FeatureGate>
 */

import type { PlanTier, FeatureAccess } from '@/types/billing'
import { PLANS } from './plans'

// ─── Feature Map ──────────────────────────────────────────────────────────────
// Add a new entry here whenever you add a gated feature.
// The value is the minimum plan required to access the feature.

export const FEATURE_MAP = {
  // Feature key          : minimum plan required
  apiAccess              : 'pro',
  advancedAnalytics      : 'pro',
  prioritySupport        : 'pro',
  customDomain           : 'team',
  unlimitedProjects      : 'pro',
  unlimitedTeamMembers   : 'team',
} as const satisfies Record<string, PlanTier>

export type FeatureKey = keyof typeof FEATURE_MAP

// ─── Plan Hierarchy ───────────────────────────────────────────────────────────

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
}

function planRank(tier: PlanTier): number {
  return PLAN_RANK[tier] ?? 0
}

// ─── Core Access Check ────────────────────────────────────────────────────────

/**
 * Check if a plan has access to a feature.
 * Use this in API routes and Server Components.
 */
export function hasFeatureAccess(
  feature: FeatureKey,
  currentPlan: PlanTier
): FeatureAccess {
  const requiredPlan = FEATURE_MAP[feature]

  if (planRank(currentPlan) >= planRank(requiredPlan)) {
    return { hasAccess: true, reason: 'included' }
  }

  return {
    hasAccess: false,
    reason: 'upgrade_required',
    requiredPlan,
  }
}

// ─── Limit Check ─────────────────────────────────────────────────────────────

/**
 * Check if a user has reached a usage limit for their plan.
 *
 * @example
 * const { withinLimit } = checkLimit('projects', currentPlan, userProjectCount)
 * if (!withinLimit) return redirect('/billing')
 */
export function checkLimit(
  limitKey: string,
  currentPlan: PlanTier,
  currentUsage: number
): { withinLimit: boolean; limit: number | 'unlimited'; usage: number } {
  const plan = PLANS[currentPlan]
  const limit = plan.limits[limitKey]

  if (limit === 'unlimited') {
    return { withinLimit: true, limit: 'unlimited', usage: currentUsage }
  }

  const numericLimit = limit as number
  return {
    withinLimit: currentUsage < numericLimit,
    limit: numericLimit,
    usage: currentUsage,
  }
}

// ─── Require Feature (throws) ─────────────────────────────────────────────────

/**
 * Throws a structured error if the user doesn't have access.
 * Use in API routes for clean error responses.
 *
 * @example
 * requireFeature('apiAccess', userPlan) // throws if no access
 */
export function requireFeature(feature: FeatureKey, currentPlan: PlanTier): void {
  const access = hasFeatureAccess(feature, currentPlan)
  if (!access.hasAccess) {
    throw new FeatureAccessError(feature, access.requiredPlan!)
  }
}

export class FeatureAccessError extends Error {
  feature: FeatureKey
  requiredPlan: PlanTier

  constructor(feature: FeatureKey, requiredPlan: PlanTier) {
    super(`Feature "${feature}" requires the ${requiredPlan} plan or higher.`)
    this.name = 'FeatureAccessError'
    this.feature = feature
    this.requiredPlan = requiredPlan
  }
}

// ─── Bulk Check ───────────────────────────────────────────────────────────────

/**
 * Check access for multiple features at once.
 * Returns a map of feature → access result.
 */
export function checkFeatures(
  features: FeatureKey[],
  currentPlan: PlanTier
): Record<FeatureKey, boolean> {
  return Object.fromEntries(
    features.map((f) => [f, hasFeatureAccess(f, currentPlan).hasAccess])
  ) as Record<FeatureKey, boolean>
}
