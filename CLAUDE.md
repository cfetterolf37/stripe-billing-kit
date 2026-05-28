# CLAUDE.md

Context file for AI-assisted development on this codebase.
Read this before making any changes to billing-related files.

---

## What this project is

A complete Next.js 15 + Supabase + Stripe billing starter kit.
Includes auth pages, protected dashboard, full billing UI, webhook handling,
feature gates, and a CLI scaffolder for publishing to npm.

Stack: Next.js 15 App Router, TypeScript, Supabase (auth + database), Stripe (billing), Tailwind CSS.

---

## Complete file map

```
app/
  (auth)/
    layout.tsx              Centered card layout for auth pages
    login/page.tsx          Email + password login (Supabase Auth)
    signup/page.tsx         Signup with email confirmation flow
  (dashboard)/
    layout.tsx              Auth-protected shell — redirects to /login if no session
                            Renders sidebar nav with Dashboard + Billing links
    dashboard/page.tsx      Example dashboard — shows subscription state + feature gate demos
    billing/page.tsx        /billing page — pricing table, status, checkout banners
  api/stripe/
    checkout/route.ts       POST /api/stripe/checkout — creates Checkout session
    portal/route.ts         POST /api/stripe/portal — creates Customer Portal session
    webhooks/route.ts       POST /api/stripe/webhooks — receives + processes Stripe events
  auth/
    callback/route.ts       Handles email confirmation links; initializes Stripe customer
                            + subscription row via getOrCreateCustomer + ensureSubscriptionRow
    signout/route.ts        POST /auth/signout — signs out + redirects to /login
  layout.tsx                Root layout with Inter font
  page.tsx                  Root redirect: /dashboard if authed, /login if not
  globals.css               Tailwind base + CSS variable theme (light + dark)

lib/
  stripe/
    client.ts               Stripe SDK singleton — import stripe from here, never directly
    checkout.ts             createCheckoutSession(), updateSubscription()
    portal.ts               createPortalSession(), getOrCreateCustomer()
    webhooks.ts             constructWebhookEvent(), handleWebhookEvent() — event router
  supabase/
    client.ts               createClient() — browser client, anon key, RLS applies
    server.ts               createServerClient() — cookie-based SSR client
                            createServiceClient() — service role, bypasses RLS
    subscriptions.ts        getSubscription(), getSubscriptionByUserId(),
                            getSubscriptionByCustomerId(), toSubscriptionState()
  billing/
    plans.ts                PLANS config, PLAN_ORDER, getPlan(), getPlanFromPriceId(),
                            isUpgrade(), getAllPriceIds()
    gates.ts                FEATURE_MAP, hasFeatureAccess(), checkLimit(),
                            requireFeature(), checkFeatures(), FeatureAccessError
    sync.ts                 syncSubscription(), syncCheckoutSession(),
                            cancelSubscription(), ensureSubscriptionRow()

components/billing/
  PricingTable.tsx          Full pricing table with monthly/yearly interval toggle
  index.tsx                 SubscriptionStatus — plan name + status badge + renewal info
                            ManageBillingButton — portal redirect, hides for free users
                            FeatureGate — renders children or fallback based on plan
                            UpgradePrompt — pre-built upgrade CTA for gate fallbacks

hooks/
  useSubscription.ts        Returns SubscriptionState + loading + error + refresh()
                            Sets up Supabase Realtime listener for live updates
  useCheckout.ts            startCheckout(priceId) — POST /api/stripe/checkout → redirect
                            openPortal() — POST /api/stripe/portal → redirect (useBillingPortal)
  useFeatureAccess.ts       Returns FeatureAccess + loading + plan for a FeatureKey

types/billing.ts            PlanTier, SubscriptionStatus, SubscriptionRow, PlanConfig,
                            PlanFeature, SubscriptionState, FeatureAccess, FeatureKey,
                            CreateCheckoutParams, ApiError, HandledStripeEvent

middleware.ts               Supabase session refresh on every request — required for SSR auth

supabase/migrations/
  001_subscriptions.sql     Creates subscriptions table, unique constraints, indexes,
                            updated_at trigger, enables Realtime publication
  002_rls_policies.sql      Enables RLS; users_read_own_subscription + users_insert_own_subscription

cli/
  create.js                 npx create-stripe-billing-kit scaffolder
                            Copies template/ into target project, detects package manager,
                            checks for missing deps, prints next steps
package.npm.json            Publishable npm package.json (rename to package.json to publish)

monetization/
  MONETIZE-OVERVIEW.md      Master strategy — revenue streams, launch sequence, the flywheel
  MONETIZE-GUMROAD.md       Listing copy, pricing tiers, thumbnail guide, launch strategy
  MONETIZE-UPWORK.md        Profile copy, service packages, proposal template, scope control
  MONETIZE-NPM.md           Open-source core + pro SaaS model, star-building, phase rollout
  MONETIZE-CONTENT.md       YouTube structure + timestamps, repurposing plan, 90-day calendar
  MONETIZE-LICENSE.md       License key server, GitHub collaborator automation, tier pricing
  MONETIZE-WHOP.md          Community membership, recurring revenue, content calendar
  MONETIZE-GITHUB.md        GitHub Sponsors setup, README as landing page, star tactics
  NPM-PUBLISHING.md         Step-by-step npm publish, .npmignore, versioning, pnpm workspaces

docs/
  SETUP.md                  11-step setup guide — Supabase, Stripe, webhooks, testing
  WEBHOOKS.md               Local testing, event reference, debugging checklist, production
  PLANS.md                  Plan config + feature gate usage, server + client patterns
  DEPLOYMENT.md             Pre-deploy checklist, Vercel setup, live mode migration
  TROUBLESHOOTING.md        Common errors indexed by exact message

BONUS/
  stripe-test-checklist.md  30+ item pre-launch QA checklist
```

---

## Architecture rules — never violate these

### Data flow

```
Stripe → Webhook → lib/stripe/webhooks.ts → lib/billing/sync.ts → Supabase DB
                                                                        ↓
                                            Client ← useSubscription ← Realtime
```

- Supabase is the **source of truth** for billing state in the app
- Stripe is the **source of truth** for payment and subscription data
- Webhooks keep them in sync — never write to Supabase from client-side code
- Never read from the Stripe API in hot paths — read from Supabase

### Client vs server — which Supabase client to use

| Context | Function | Key behavior |
|---------|----------|--------------|
| Client Components | `createClient()` | Anon key, RLS enforced |
| Server Components | `createServerClient()` | Cookie-based auth, RLS enforced |
| API routes | `createServerClient()` | Cookie-based auth, RLS enforced |
| Webhook handlers | `createServiceClient()` | Service role key, **bypasses RLS** |

**Never use `createServiceClient()` in Server Components or anything user-facing.**
It bypasses RLS and must only be used in webhook handlers and admin operations.

### Webhook route — critical constraint

`app/api/stripe/webhooks/route.ts` must read the body as `await req.text()`.
Never change to `req.json()` — Stripe's signature verification requires the raw bytes.
This is the most common break point when developers modify the kit.

### Idempotency

All Supabase writes use `upsert`. Stripe may deliver the same event more than once.
Handlers must produce the same result when called multiple times.

### Auth callback initializes billing

`app/auth/callback/route.ts` is the hook point for new user setup.
After confirming a session, it calls `getOrCreateCustomer` + `ensureSubscriptionRow`.
This guarantees every authenticated user has a subscription row from day one.

---

## The two files to edit first

1. **`lib/billing/plans.ts`**
   - Change plan names, descriptions, price display amounts
   - Set your Stripe Price IDs via env vars (`NEXT_PUBLIC_STRIPE_*_PRICE_ID`)
   - Update feature lists for the pricing table
   - Adjust `limits` object for usage cap enforcement

2. **`lib/billing/gates.ts`**
   - Add entries to `FEATURE_MAP` for each gated feature
   - Value = minimum required plan (`'pro'` or `'team'`)
   - TypeScript's `satisfies` constraint enforces valid plan names
   - Update `PLAN_RANK` if you add a new plan tier

---

## Common patterns

### Protect an API route by plan

```typescript
import { createServerClient } from '@/lib/supabase/server'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import { requireFeature } from '@/lib/billing/gates'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = await getSubscription()
  const { plan } = toSubscriptionState(row)

  requireFeature('apiAccess', plan) // throws FeatureAccessError if no access

  // ... handler logic
}
```

### Gate a UI section (client-side)

```tsx
import { FeatureGate, UpgradePrompt } from '@/components/billing'

<FeatureGate feature="customDomain" fallback={<UpgradePrompt feature="customDomain" />}>
  <DomainSettings />
</FeatureGate>
```

### Gate a route (server-side layout)

```typescript
import { redirect } from 'next/navigation'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import { hasFeatureAccess } from '@/lib/billing/gates'

export default async function ProLayout({ children }) {
  const row = await getSubscription()
  const { plan } = toSubscriptionState(row)
  const { hasAccess } = hasFeatureAccess('apiAccess', plan)
  if (!hasAccess) redirect('/billing')
  return <>{children}</>
}
```

### Check a usage limit

```typescript
import { checkLimit } from '@/lib/billing/gates'

const { withinLimit, limit } = checkLimit('projects', userPlan, currentCount)
if (!withinLimit) {
  return NextResponse.json({ error: `Project limit reached (${limit})` }, { status: 403 })
}
```

### Trigger checkout from a button

```tsx
'use client'
import { useCheckout } from '@/hooks/useCheckout'
import { PLANS } from '@/lib/billing/plans'

export function UpgradeButton() {
  const { startCheckout, loading } = useCheckout()
  const priceId = PLANS.pro.monthlyPriceId
  if (!priceId) return null
  return <button onClick={() => startCheckout(priceId)} disabled={loading}>Upgrade to Pro</button>
}
```

### Read subscription state server-side

```typescript
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'

const row = await getSubscription()
const { plan, isActive, isPastDue, currentPeriodEnd } = toSubscriptionState(row)
```

### Read subscription state client-side

```typescript
import { useSubscription } from '@/hooks/useSubscription'

const { plan, isActive, isPastDue, loading } = useSubscription()
```

---

## Adding a new plan tier — full checklist

1. Add the new tier string to `PlanTier` in `types/billing.ts`
2. Add the plan config to `PLANS` in `lib/billing/plans.ts`
3. Add the tier to `PLAN_ORDER` in `lib/billing/plans.ts`
4. Add new price ID env vars to `.env.example` and `.env.local`
5. Update `PLAN_RANK` in `lib/billing/gates.ts` to include the new tier
6. Create the product and prices in Stripe Dashboard (test + live mode)

---

## Environment variables reference

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Used for Stripe redirect URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only — bypasses RLS — never expose to client |
| `STRIPE_SECRET_KEY` | Yes | Server-only (`sk_test_` or `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` from `stripe listen` or Stripe Dashboard |
| `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID` | Yes | `price_...` from Stripe |
| `NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID` | Yes | `price_...` from Stripe |
| `NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID` | Yes | `price_...` from Stripe |
| `NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID` | Yes | `price_...` from Stripe |

---

## Do not

- Do not call `createServiceClient()` in Server Components, Client Components, or user-facing code
- Do not use `req.json()` in the webhooks route — use `req.text()` only
- Do not write to the `subscriptions` table from client-side code
- Do not read from the Stripe API directly in hot paths — read from Supabase
- Do not modify `002_rls_policies.sql` to remove `users_read_own_subscription`
- Do not hardcode price IDs — always read from env vars via `plans.ts`
- Do not expose `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the client bundle
- Do not skip `middleware.ts` — without it, server-side session reads break on refresh
