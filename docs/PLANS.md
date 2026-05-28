# Plans & Feature Gates

How to configure your billing tiers and control feature access.

---

## The two files that matter

Everything plan-related lives in two files:

- `lib/billing/plans.ts` — defines your tiers, prices, and feature lists
- `lib/billing/gates.ts` — defines what each tier can access

---

## Configuring plans (`lib/billing/plans.ts`)

### Changing plan names and prices

The `PLANS` object in `plans.ts` is your central config. Edit it freely:

```typescript
pro: {
  id: 'pro',
  name: 'Professional',       // Change display name
  description: 'For solo developers',
  monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
  price: {
    monthly: 29,              // Display price (UI only — actual price is in Stripe)
    yearly: 23,
  },
  // ...
}
```

> **Important:** The `price.monthly` and `price.yearly` values are **display-only**.
> The actual charge is determined by the Stripe Price you created in the dashboard.
> Keep them in sync with what's in Stripe to avoid confusion.

### Adding a new plan tier

1. Add the tier name to the `PlanTier` type in `types/billing.ts`:
   ```typescript
   export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise'
   ```

2. Add the config in `plans.ts`:
   ```typescript
   enterprise: {
     id: 'enterprise',
     name: 'Enterprise',
     monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? null,
     // ...
   }
   ```

3. Add the price ID to `.env.example` and `.env.local`

4. Create the product and price in Stripe Dashboard

5. Update `PLAN_ORDER` in `plans.ts` to include the new tier

### Removing a plan tier

If you only want two tiers (free + pro):
1. Remove `team` from `PlanTier` in `types/billing.ts`
2. Remove the `team` entry from `PLANS` in `plans.ts`
3. Update `PLAN_ORDER` to `['free', 'pro']`
4. Remove team-related feature gates from `gates.ts`

---

## Configuring feature gates (`lib/billing/gates.ts`)

### The FEATURE_MAP

```typescript
export const FEATURE_MAP = {
  apiAccess:           'pro',   // requires pro or higher
  advancedAnalytics:   'pro',
  customDomain:        'team',  // requires team only
} as const
```

The key is your feature identifier (used in code). The value is the minimum
plan required to access the feature.

### Adding a new gated feature

1. Add an entry to `FEATURE_MAP`:
   ```typescript
   export const FEATURE_MAP = {
     // existing...
     exportToCsv: 'pro',
   } as const
   ```

2. Use it in a Server Component or API route:
   ```typescript
   import { requireFeature } from '@/lib/billing/gates'

   // In an API route:
   requireFeature('exportToCsv', userPlan) // throws FeatureAccessError if no access
   ```

3. Or use it in a Client Component:
   ```tsx
   import { FeatureGate, UpgradePrompt } from '@/components/billing'

   <FeatureGate feature="exportToCsv" fallback={<UpgradePrompt feature="exportToCsv" />}>
     <ExportButton />
   </FeatureGate>
   ```

---

## Usage limits

Some features aren't binary — they have limits per plan (3 projects on free, unlimited on pro).

### Checking a limit in an API route

```typescript
import { checkLimit } from '@/lib/billing/gates'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'

const row = await getSubscription()
const { plan } = toSubscriptionState(row)

const currentProjectCount = await getProjectCount(userId)
const { withinLimit, limit } = checkLimit('projects', plan, currentProjectCount)

if (!withinLimit) {
  return NextResponse.json(
    { error: `Project limit reached (${limit}). Upgrade to create more.` },
    { status: 403 }
  )
}
```

### Updating limits per plan

In `plans.ts`, each plan has a `limits` object:

```typescript
pro: {
  limits: {
    projects: 'unlimited',
    teamMembers: 5,
    apiCallsPerMonth: 50_000,
  }
}
```

Add any key you need here. The key must match what you pass to `checkLimit()`.

---

## Reading plan data server-side

In Server Components and API routes:

```typescript
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'

const row = await getSubscription()
const { plan, isActive, isPastDue } = toSubscriptionState(row)
```

`getSubscription()` calls `getCurrentUser()` from `lib/auth` internally — no need to
import or call auth helpers yourself. Swap `lib/auth/index.ts` to change providers.

## Reading plan data client-side

In Client Components:

```typescript
import { useSubscription } from '@/hooks/useSubscription'

const { plan, isActive, isPastDue, loading } = useSubscription()
```

## Protecting a whole route

In a Server Component layout:

```typescript
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import { hasFeatureAccess } from '@/lib/billing/gates'

export default async function ProFeatureLayout({ children }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const row = await getSubscription()
  const { plan } = toSubscriptionState(row)
  const { hasAccess } = hasFeatureAccess('apiAccess', plan)

  if (!hasAccess) redirect('/billing')

  return <>{children}</>
}
```
