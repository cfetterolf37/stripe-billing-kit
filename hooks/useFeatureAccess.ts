/**
 * useFeatureAccess
 *
 * Client-side feature gate hook. Returns whether the current user
 * has access to a specific feature based on their subscription plan.
 *
 * Usage:
 *   const { hasAccess, requiredPlan, loading } = useFeatureAccess('apiAccess')
 *
 *   if (!hasAccess) return <UpgradePrompt requiredPlan={requiredPlan} />
 */

'use client'

import { useSubscription } from './useSubscription'
import { hasFeatureAccess } from '@/lib/billing/gates'
import type { FeatureKey, FeatureAccess, PlanTier } from '@/types/billing'

interface UseFeatureAccessResult extends FeatureAccess {
  loading: boolean
  plan: PlanTier
}

export function useFeatureAccess(feature: FeatureKey): UseFeatureAccessResult {
  const { plan, loading } = useSubscription()

  if (loading) {
    return {
      hasAccess: false,
      reason: 'loading',
      loading: true,
      plan,
    }
  }

  const access = hasFeatureAccess(feature, plan)

  return {
    ...access,
    loading: false,
    plan,
  }
}
