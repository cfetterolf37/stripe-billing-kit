# Stripe Billing Kit

Production-ready Stripe billing for Next.js + Supabase — with a typed feature gate system that most starters skip entirely.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase · Stripe · Tailwind CSS

```bash
npx create-stripe-billing-kit
```

> Run inside an existing Next.js project to scaffold billing in seconds.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/stripe-billing-kit)

---

## Why this kit

Most billing starters wire up Checkout and a webhook handler and call it done. This kit goes further:

| Feature | This kit | Vercel's template (7.6k ⭐) |
|---|---|---|
| Stripe Checkout + Portal | ✅ | ✅ |
| Webhook handler (idempotent) | ✅ | ✅ |
| Supabase schema + RLS migrations | ✅ | ✅ |
| Typed feature gates (`hasFeatureAccess`, `requireFeature`) | ✅ | ❌ |
| `<FeatureGate>` client component | ✅ | ❌ |
| Usage limit enforcement (`checkLimit`) | ✅ | ❌ |
| `useSubscription` with per-user realtime filter | ✅ | ❌ |
| `useFeatureAccess` hook | ✅ | ❌ |
| `UpgradePrompt` fallback component | ✅ | ❌ |
| Monthly/yearly toggle with exact savings per plan | ✅ | ❌ |
| Full auth pages (login, signup, callback, signout) | ✅ | ❌ |
| Auth-agnostic adapter (swap Clerk, NextAuth, Auth0) | ✅ | ❌ |
| Dark mode (CSS variables + `darkMode: 'class'`) | ✅ | ❌ |
| Unit tests (vitest) + E2E tests (Playwright) | ✅ | ❌ |

---

## What's included

### The feature gate system — this kit's core differentiator

Add one entry to `FEATURE_MAP` and you get typed access checks everywhere — server routes, Server Components, client hooks, and UI components — all from the same source of truth.

```ts
// lib/billing/gates.ts — add your feature here
export const FEATURE_MAP = {
  apiAccess    : 'pro',
  customDomain : 'team',
  // add yours ↑
} as const satisfies Record<string, PlanTier>
```

```ts
// Server: API route guard — throws FeatureAccessError with requiredPlan
requireFeature('apiAccess', userPlan)

// Server: check without throwing
const { hasAccess, requiredPlan } = hasFeatureAccess('apiAccess', userPlan)

// Server: usage cap enforcement
const { withinLimit, limit } = checkLimit('projects', userPlan, currentCount)

// Client: hook
const { hasAccess, loading } = useFeatureAccess('apiAccess')

// Client: component
<FeatureGate feature="apiAccess" fallback={<UpgradePrompt feature="apiAccess" />}>
  <ApiKeyPanel />
</FeatureGate>
```

### Billing core

- Stripe Checkout session creation (monthly + yearly intervals)
- Stripe Customer Portal — users manage their own subscriptions
- Webhook handler with signature verification, idempotent upserts, all key events covered
- Supabase schema + Row Level Security migrations (run in 30 seconds)
- Upgrade/downgrade via Stripe portal — no custom proration code needed
- Real-time UI updates via Supabase Realtime (filtered per-user — no thundering herd)

### React hooks

- `useSubscription` — current user's subscription state with live updates
- `useCheckout` — redirects to Stripe Checkout
- `useBillingPortal` — opens Stripe Customer Portal
- `useFeatureAccess` — client-side feature gate hook

### Drop-in components

- `<PricingTable>` — plan cards with monthly/yearly toggle, exact savings per plan
- `<SubscriptionStatus>` — current plan, status badge, renewal/cancellation info
- `<ManageBillingButton>` — opens portal, hides itself for free users
- `<FeatureGate>` — conditionally renders based on plan access
- `<UpgradePrompt>` — pre-built upgrade CTA that links to `/billing`

### Auth adapter — swap providers without touching billing code

The billing system uses a single `getCurrentUser()` function as its auth boundary. Swap `lib/auth/index.ts` to change providers — the rest of the codebase doesn't change.

**Default (Supabase Auth) — `lib/auth/index.ts`:**
```ts
import { createServerClient } from '@/lib/supabase/server'

export type AuthUser = { id: string; email: string }

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || !user.email) return null
  return { id: user.id, email: user.email }
}
```

**Clerk — copy from `lib/auth/adapters/clerk.ts`:**
```ts
import { currentUser } from '@clerk/nextjs/server'

export async function getCurrentUser(): Promise<AuthUser | null> {
  const user = await currentUser()
  if (!user) return null
  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
  }
}
```

**NextAuth — copy from `lib/auth/adapters/nextauth.ts`:**
```ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.email) return null
  return { id: session.user.id, email: session.user.email }
}
```

**Auth0 — copy from `lib/auth/adapters/auth0.ts`:**
```ts
import { getSession } from '@auth0/nextjs-auth0'

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession()
  if (!session?.user) return null
  return { id: session.user.sub, email: session.user.email ?? '' }
}
```

Each adapter file includes full setup instructions and new-user billing initialization notes (Clerk webhook, NextAuth events, Auth0 Actions).

### Auth (Supabase default)

- Login page (`/login`)
- Signup page (`/signup`) with email confirmation flow
- Auth callback route — initializes Stripe customer + subscription row on first login
- Sign-out route
- Supabase middleware for session refresh on every request

### Full app structure

- `/dashboard` — example page showing subscription state + server-side feature gates
- `/billing` — pricing table, subscription status, checkout result banners
- `(auth)` route group — centered layout for login/signup
- `(dashboard)` route group — auth-protected shell with sidebar nav

### Config & tooling

- `lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- Full TypeScript types in `types/billing.ts` — single source of truth
- `middleware.ts` — Supabase session refresh (required for SSR auth)
- `tailwind.config.ts` — shadcn-compatible CSS variable theme with `darkMode: 'class'`
- `vercel.json` — 30s function timeout for the webhook route

### Tests

```bash
npm test           # vitest unit tests (billing logic — no DB required)
npm run test:e2e   # Playwright E2E tests (requires dev server)
```

Unit tests cover `hasFeatureAccess`, `checkLimit`, `requireFeature`, `checkFeatures`, `FeatureAccessError`, `getPlan`, `getPlanFromPriceId`, `isUpgrade`, `getAllPriceIds`.

E2E tests cover unauthenticated redirects, login/signup pages, and (with test credentials) authenticated billing flows.

---

## Quickstart

### 1. Clone or scaffold

```bash
# Clone the repo
git clone https://github.com/your-username/stripe-billing-kit my-app
cd my-app
npm install

# Or scaffold into an existing Next.js project (once published to npm):
npx create-stripe-billing-kit
```

### 2. Set environment variables

```bash
cp .env.example .env.local
# Fill in all values — detailed instructions in docs/SETUP.md
```

### 3. Run database migrations

```bash
supabase db push
# Or paste supabase/migrations/001_subscriptions.sql then 002_rls_policies.sql
# into the Supabase SQL Editor and run in order
```

### 4. Start the local webhook listener

```bash
# In a separate terminal — keep this running while developing:
stripe listen --forward-to localhost:3000/api/stripe/webhooks
# Copy the whsec_... value into STRIPE_WEBHOOK_SECRET in .env.local
```

### 5. Start dev and test

```bash
npm run dev
```

Navigate to `/billing`, click an upgrade button, use test card `4242 4242 4242 4242`.

**Full setup guide:** [docs/SETUP.md](./docs/SETUP.md)

---

## Directory structure

```
app/
  (auth)/
    layout.tsx              Centered card layout for auth pages
    login/page.tsx          Email + password login
    signup/page.tsx         Signup with email confirmation
  (dashboard)/
    layout.tsx              Auth-protected shell with sidebar nav
    dashboard/page.tsx      Example dashboard with feature gate demos
    billing/page.tsx        Pricing table + subscription status
  api/
    auth/session/route.ts   GET — returns current user id + email (auth-agnostic)
    subscription/route.ts   GET — returns current user's subscription state
    stripe/
      checkout/route.ts     POST — creates Stripe Checkout session
      portal/route.ts       POST — creates Stripe Customer Portal session
      webhooks/route.ts     POST — receives and processes Stripe webhook events
  auth/
    callback/route.ts       Handles email confirmation + initializes billing state
    signout/route.ts        Signs out and redirects to /login
  layout.tsx                Root layout
  page.tsx                  Root page (redirects to /dashboard or /login)
  globals.css               Tailwind base styles + CSS variable theme

lib/
  auth/
    index.ts                getCurrentUser() — swap this to change auth provider
    adapters/
      clerk.ts              Clerk adapter (copy to index.ts to use)
      nextauth.ts           NextAuth adapter (copy to index.ts to use)
      auth0.ts              Auth0 adapter (copy to index.ts to use)
  stripe/
    client.ts               Stripe SDK singleton (server-only)
    checkout.ts             createCheckoutSession(), updateSubscription()
    portal.ts               createPortalSession(), getOrCreateCustomer()
    webhooks.ts             constructWebhookEvent(), handleWebhookEvent()
  supabase/
    client.ts               Browser client (anon key, RLS applies)
    server.ts               Server client (cookie-based) + service client (service role)
    subscriptions.ts        DB queries: getSubscription(), toSubscriptionState()
  billing/
    plans.ts                ← Edit this to configure your tiers
    gates.ts                ← Edit this to configure feature access
    sync.ts                 Stripe → Supabase sync (called by webhook handlers)
  utils.ts                  cn() utility (clsx + tailwind-merge)

components/billing/
  PricingTable.tsx          Plan cards with monthly/yearly toggle + upgrade CTAs
  index.tsx                 SubscriptionStatus, ManageBillingButton, FeatureGate, UpgradePrompt

hooks/
  useSubscription.ts        Current user's subscription state + per-user realtime
  useCheckout.ts            startCheckout(priceId), openPortal() (useBillingPortal)
  useFeatureAccess.ts       Client-side feature gate hook

tests/
  billing/
    gates.test.ts           Unit tests for all gate functions
    plans.test.ts           Unit tests for plan config helpers
  e2e/
    billing.spec.ts         Playwright E2E tests for billing flows

types/billing.ts            All TypeScript types (single source of truth)
middleware.ts               Supabase session refresh on every request
tailwind.config.ts          Tailwind config — darkMode: 'class', CSS variable theme
vitest.config.ts            Vitest unit test configuration
playwright.config.ts        Playwright E2E configuration
vercel.json                 30s timeout for webhook function
package.json                Project dependencies + test scripts

supabase/migrations/
  001_subscriptions.sql     Creates subscriptions table + indexes + realtime
  002_rls_policies.sql      RLS policies (users read only their own row)

cli/
  create.js                 CLI scaffolder for npx create-stripe-billing-kit

docs/
  SETUP.md                  Complete step-by-step setup guide
  WEBHOOKS.md               Webhook testing, debugging, production setup
  PLANS.md                  Plan config + feature gate usage guide
  DEPLOYMENT.md             Production deployment checklist
  TROUBLESHOOTING.md        Common errors indexed by message
```

---

## Configure your plans

Open [lib/billing/plans.ts](./lib/billing/plans.ts) — the one file to configure your tiers:
- Plan names, descriptions, display prices (actual charge is set in Stripe)
- Feature lists shown in `<PricingTable>`
- Usage limits enforced by `checkLimit()`

Open [lib/billing/gates.ts](./lib/billing/gates.ts) — controls feature access:
- Add a key to `FEATURE_MAP` with the minimum required plan
- TypeScript enforces valid feature keys everywhere via `satisfies`

---

## Common patterns

### Gate a UI section (client component)

```tsx
import { FeatureGate, UpgradePrompt } from '@/components/billing'

<FeatureGate feature="apiAccess" fallback={<UpgradePrompt feature="apiAccess" />}>
  <ApiKeyPanel />
</FeatureGate>
```

### Protect an API route

```typescript
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import { requireFeature } from '@/lib/billing/gates'

const row = await getSubscription()
const { plan } = toSubscriptionState(row)
requireFeature('apiAccess', plan) // throws FeatureAccessError → return 403
```

### Gate a layout (server-side redirect)

```typescript
import { redirect } from 'next/navigation'
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'
import { hasFeatureAccess } from '@/lib/billing/gates'

const row = await getSubscription()
const { plan } = toSubscriptionState(row)
const { hasAccess } = hasFeatureAccess('apiAccess', plan)
if (!hasAccess) redirect('/billing')
```

### Check a usage limit

```typescript
import { checkLimit } from '@/lib/billing/gates'

const { withinLimit, limit } = checkLimit('projects', userPlan, currentCount)
if (!withinLimit) {
  return NextResponse.json({ error: `Limit reached (${limit})` }, { status: 403 })
}
```

### Trigger checkout from a button

```tsx
'use client'
import { useCheckout } from '@/hooks/useCheckout'

export function UpgradeButton({ priceId }: { priceId: string }) {
  const { startCheckout, loading } = useCheckout()
  return (
    <button onClick={() => startCheckout(priceId)} disabled={loading}>
      {loading ? 'Loading…' : 'Upgrade'}
    </button>
  )
}
```

### Read subscription state (server-side)

```typescript
import { getSubscription, toSubscriptionState } from '@/lib/supabase/subscriptions'

const row = await getSubscription()
const { plan, isActive, isPastDue, currentPeriodEnd } = toSubscriptionState(row)
```

### Read subscription state (client-side)

```typescript
import { useSubscription } from '@/hooks/useSubscription'

const { plan, isActive, isPastDue, loading } = useSubscription()
```

---

## Data flow

```
Stripe → Webhook → lib/stripe/webhooks.ts → lib/billing/sync.ts → Supabase DB
                                                                        ↓
                                            Client ← useSubscription ← Realtime
```

- **Supabase** is the source of truth for billing state in the app
- **Stripe** is the source of truth for payment data
- Webhooks keep them in sync — never write to Supabase from client code
- Never read from the Stripe API in hot paths — read from Supabase

---

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/SETUP.md](./docs/SETUP.md) | Complete step-by-step setup — Supabase, Stripe, webhooks, testing |
| [docs/WEBHOOKS.md](./docs/WEBHOOKS.md) | Webhook testing, debugging, production setup |
| [docs/PLANS.md](./docs/PLANS.md) | Plan configuration + feature gate usage |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production checklist, Vercel, live mode |
| [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | Common errors indexed by exact message |
| [CLAUDE.md](./CLAUDE.md) | AI assistant context file |

---

## Environment variables

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

## Test cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 9995` | Always declines |
| `4000 0000 0000 0341` | Payment always fails |

Expiry `12/34`, CVC `123`, any zip for all test cards.

---

## Adding a new plan tier

1. Add the tier string to `PlanTier` in `types/billing.ts`
2. Add the plan config to `PLANS` in `lib/billing/plans.ts`
3. Add the tier to `PLAN_ORDER` in `lib/billing/plans.ts`
4. Add new price ID env vars to `.env.example` and `.env.local`
5. Update `PLAN_RANK` in `lib/billing/gates.ts` to include the new tier
6. Create the product and prices in Stripe Dashboard (test + live mode)
