import { describe, it, expect } from 'vitest'
import {
  PLANS,
  PLAN_ORDER,
  getPlan,
  getPlanFromPriceId,
  isUpgrade,
  getAllPriceIds,
} from '@/lib/billing/plans'
import type { PlanTier } from '@/types/billing'

describe('PLANS config', () => {
  it('contains free, pro, and team tiers', () => {
    expect(PLANS.free).toBeDefined()
    expect(PLANS.pro).toBeDefined()
    expect(PLANS.team).toBeDefined()
  })

  it('free plan has no price IDs', () => {
    expect(PLANS.free.monthlyPriceId).toBeNull()
    expect(PLANS.free.yearlyPriceId).toBeNull()
    expect(PLANS.free.price.monthly).toBe(0)
    expect(PLANS.free.price.yearly).toBe(0)
  })

  it('paid plans have non-zero prices', () => {
    expect(PLANS.pro.price.monthly).toBeGreaterThan(0)
    expect(PLANS.pro.price.yearly).toBeGreaterThan(0)
    expect(PLANS.team.price.monthly).toBeGreaterThan(0)
    expect(PLANS.team.price.yearly).toBeGreaterThan(0)
  })

  it('pro plan is marked popular', () => {
    expect(PLANS.pro.popular).toBe(true)
  })

  it('all plans have a limits object', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.limits).toBeDefined()
      expect(typeof plan.limits).toBe('object')
    }
  })

  it('all plans have features array', () => {
    for (const plan of Object.values(PLANS)) {
      expect(Array.isArray(plan.features)).toBe(true)
      expect(plan.features.length).toBeGreaterThan(0)
    }
  })
})

describe('PLAN_ORDER', () => {
  it('is ordered from least to most permissive', () => {
    expect(PLAN_ORDER).toEqual(['free', 'pro', 'team'])
  })

  it('contains all plan tiers', () => {
    const tiers = Object.keys(PLANS) as PlanTier[]
    for (const tier of tiers) {
      expect(PLAN_ORDER).toContain(tier)
    }
  })
})

describe('getPlan', () => {
  it('returns the correct plan config', () => {
    expect(getPlan('free')).toBe(PLANS.free)
    expect(getPlan('pro')).toBe(PLANS.pro)
    expect(getPlan('team')).toBe(PLANS.team)
  })

  it('returned config has id matching the tier', () => {
    expect(getPlan('pro').id).toBe('pro')
    expect(getPlan('team').id).toBe('team')
  })
})

describe('getPlanFromPriceId', () => {
  it('returns null when price ID is not configured (env var missing)', () => {
    // In test env, NEXT_PUBLIC_STRIPE_* are not set, so all priceIds are null.
    const result = getPlanFromPriceId('price_nonexistent')
    expect(result).toBeNull()
  })

  it('returns null for an unknown price ID', () => {
    expect(getPlanFromPriceId('price_unknown_xyz')).toBeNull()
  })

  it('matches a monthly price ID when env is set', () => {
    // Temporarily inject a price ID to test matching logic.
    const originalMonthly = PLANS.pro.monthlyPriceId
    ;(PLANS.pro as { monthlyPriceId: string | null }).monthlyPriceId = 'price_test_pro_monthly'
    expect(getPlanFromPriceId('price_test_pro_monthly')).toBe('pro')
    ;(PLANS.pro as { monthlyPriceId: string | null }).monthlyPriceId = originalMonthly
  })

  it('matches a yearly price ID when env is set', () => {
    const originalYearly = PLANS.team.yearlyPriceId
    ;(PLANS.team as { yearlyPriceId: string | null }).yearlyPriceId = 'price_test_team_yearly'
    expect(getPlanFromPriceId('price_test_team_yearly')).toBe('team')
    ;(PLANS.team as { yearlyPriceId: string | null }).yearlyPriceId = originalYearly
  })
})

describe('isUpgrade', () => {
  it('free → pro is an upgrade', () => {
    expect(isUpgrade('free', 'pro')).toBe(true)
  })

  it('free → team is an upgrade', () => {
    expect(isUpgrade('free', 'team')).toBe(true)
  })

  it('pro → team is an upgrade', () => {
    expect(isUpgrade('pro', 'team')).toBe(true)
  })

  it('same tier is not an upgrade', () => {
    expect(isUpgrade('pro', 'pro')).toBe(false)
    expect(isUpgrade('free', 'free')).toBe(false)
  })

  it('downgrade is not an upgrade', () => {
    expect(isUpgrade('pro', 'free')).toBe(false)
    expect(isUpgrade('team', 'pro')).toBe(false)
  })
})

describe('getAllPriceIds', () => {
  it('returns an array', () => {
    expect(Array.isArray(getAllPriceIds())).toBe(true)
  })

  it('returns only non-null strings', () => {
    const ids = getAllPriceIds()
    for (const id of ids) {
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    }
  })

  it('excludes null values from plans without configured IDs', () => {
    // Free plan has null price IDs — should not appear.
    const ids = getAllPriceIds()
    expect(ids).not.toContain(null)
  })
})
