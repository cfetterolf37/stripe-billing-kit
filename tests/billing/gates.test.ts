import { describe, it, expect } from 'vitest'
import {
  hasFeatureAccess,
  checkLimit,
  requireFeature,
  checkFeatures,
  FeatureAccessError,
  FEATURE_MAP,
} from '@/lib/billing/gates'
import type { PlanTier } from '@/types/billing'

describe('hasFeatureAccess', () => {
  it('grants access when plan meets the requirement', () => {
    const result = hasFeatureAccess('apiAccess', 'pro')
    expect(result.hasAccess).toBe(true)
    expect(result.reason).toBe('included')
  })

  it('grants access when plan exceeds the requirement', () => {
    const result = hasFeatureAccess('apiAccess', 'team')
    expect(result.hasAccess).toBe(true)
  })

  it('denies access when plan is below the requirement', () => {
    const result = hasFeatureAccess('apiAccess', 'free')
    expect(result.hasAccess).toBe(false)
    expect(result.reason).toBe('upgrade_required')
    expect(result.requiredPlan).toBe('pro')
  })

  it('denies team-only features for pro plan', () => {
    const result = hasFeatureAccess('customDomain', 'pro')
    expect(result.hasAccess).toBe(false)
    expect(result.requiredPlan).toBe('team')
  })

  it('grants team-only features for team plan', () => {
    const result = hasFeatureAccess('customDomain', 'team')
    expect(result.hasAccess).toBe(true)
  })

  it('handles all feature keys without throwing', () => {
    const plans: PlanTier[] = ['free', 'pro', 'team']
    for (const feature of Object.keys(FEATURE_MAP) as (keyof typeof FEATURE_MAP)[]) {
      for (const plan of plans) {
        expect(() => hasFeatureAccess(feature, plan)).not.toThrow()
      }
    }
  })
})

describe('checkLimit', () => {
  it('allows usage below the limit', () => {
    const result = checkLimit('projects', 'free', 2)
    expect(result.withinLimit).toBe(true)
    expect(result.limit).toBe(3)
    expect(result.usage).toBe(2)
  })

  it('blocks usage at or above the limit', () => {
    const result = checkLimit('projects', 'free', 3)
    expect(result.withinLimit).toBe(false)
  })

  it('always allows usage on unlimited plans', () => {
    const result = checkLimit('projects', 'pro', 9999)
    expect(result.withinLimit).toBe(true)
    expect(result.limit).toBe('unlimited')
  })

  it('returns unlimited for team plan teamMembers', () => {
    const result = checkLimit('teamMembers', 'team', 1000)
    expect(result.withinLimit).toBe(true)
    expect(result.limit).toBe('unlimited')
  })
})

describe('requireFeature', () => {
  it('does not throw when access is granted', () => {
    expect(() => requireFeature('apiAccess', 'pro')).not.toThrow()
    expect(() => requireFeature('apiAccess', 'team')).not.toThrow()
  })

  it('throws FeatureAccessError when access is denied', () => {
    expect(() => requireFeature('apiAccess', 'free')).toThrow(FeatureAccessError)
  })

  it('error carries feature and requiredPlan', () => {
    try {
      requireFeature('customDomain', 'pro')
    } catch (err) {
      expect(err).toBeInstanceOf(FeatureAccessError)
      const e = err as FeatureAccessError
      expect(e.feature).toBe('customDomain')
      expect(e.requiredPlan).toBe('team')
      expect(e.name).toBe('FeatureAccessError')
    }
  })
})

describe('checkFeatures', () => {
  it('returns a map of feature → boolean for multiple features', () => {
    const result = checkFeatures(['apiAccess', 'customDomain'], 'pro')
    expect(result.apiAccess).toBe(true)
    expect(result.customDomain).toBe(false)
  })

  it('all features false for free plan', () => {
    const result = checkFeatures(['apiAccess', 'advancedAnalytics', 'customDomain'], 'free')
    expect(Object.values(result).every((v) => v === false)).toBe(true)
  })

  it('all features true for team plan', () => {
    const result = checkFeatures(
      Object.keys(FEATURE_MAP) as (keyof typeof FEATURE_MAP)[],
      'team'
    )
    expect(Object.values(result).every((v) => v === true)).toBe(true)
  })
})

describe('FeatureAccessError', () => {
  it('is an instance of Error', () => {
    const err = new FeatureAccessError('apiAccess', 'pro')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(FeatureAccessError)
  })

  it('has a descriptive message', () => {
    const err = new FeatureAccessError('apiAccess', 'pro')
    expect(err.message).toContain('apiAccess')
    expect(err.message).toContain('pro')
  })
})
