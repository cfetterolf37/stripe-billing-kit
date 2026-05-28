# Setup Guide

Complete walkthrough from zero to a working Stripe billing integration.
Follow every step in order. Don't skip ahead — each step depends on the previous one.

Estimated time: 45–60 minutes on a fresh project.

---

## Prerequisites

Before starting, make sure you have:

- Node.js 18+ installed (`node --version`)
- A Supabase account and project at [supabase.com](https://supabase.com)
- A Stripe account at [stripe.com](https://stripe.com) (test mode is fine to start)
- The Stripe CLI installed (see Step 6)
- Your Next.js project set up with the App Router

---

## Step 1 — Install dependencies

```bash
npm install stripe @stripe/stripe-js @supabase/supabase-js @supabase/ssr
```

That's the full dependency list. No other packages required.

---

## Step 2 — Copy the kit files into your project

Copy the following directories from the kit into your project root:

```
app/api/stripe/          → your app/api/stripe/
app/api/auth/session/    → your app/api/auth/session/
app/api/subscription/    → your app/api/subscription/
lib/auth/                → your lib/auth/
lib/stripe/              → your lib/stripe/
lib/supabase/            → your lib/supabase/
lib/billing/             → your lib/billing/
components/billing/      → your components/billing/
hooks/                   → your hooks/
types/billing.ts         → your types/billing.ts
supabase/migrations/     → your supabase/migrations/
```

If you already have files in any of these paths, merge carefully — don't overwrite
existing supabase client setup if you've customized it.

---

## Step 3 — Set up environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

You'll fill in each value in the steps below. Leave the file open.

---

## Step 4 — Configure Supabase

### 4a. Get your Supabase credentials

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon in the left sidebar)
3. Click **API**
4. Copy the **Project URL** → paste into `NEXT_PUBLIC_SUPABASE_URL`
5. Under **Project API keys**, copy the **anon (public)** key → paste into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Copy the **service_role** key → paste into `SUPABASE_SERVICE_ROLE_KEY`

> **Warning:** The service_role key bypasses Row Level Security. Never expose it
> in client-side code or commit it to version control.

### 4b. Run the database migrations

The kit ships two migration files. Run them in order.

**Option A: Supabase CLI (recommended)**

```bash
# If you haven't linked your project yet:
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

**Option B: Supabase SQL Editor**

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open `supabase/migrations/001_subscriptions.sql`, copy the entire contents, paste, and click **Run**
5. Open `supabase/migrations/002_rls_policies.sql`, copy the entire contents, paste, and click **Run**

### 4c. Verify the table was created

In Supabase SQL Editor, run:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
```

You should see 13 columns: `id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`,
`plan`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`,
`trial_end`, `created_at`, `updated_at`.

### 4d. Verify RLS is enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'subscriptions';
```

`rowsecurity` should be `true`.

### 4e. Enable Realtime (if not already)

In your Supabase dashboard:
1. Click **Database** → **Replication**
2. Find `public.subscriptions` in the table list
3. Toggle it to **enabled**

This powers the live-update behavior in `useSubscription` — the UI refreshes
the moment a webhook writes new data.

---

## Step 5 — Configure Stripe

### 5a. Get your Stripe secret key

1. Log in to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top-right)
3. Click **Developers** in the top menu
4. Click **API keys**
5. Copy the **Secret key** (starts with `sk_test_`) → paste into `STRIPE_SECRET_KEY`

### 5b. Create your products and prices

1. In the Stripe Dashboard, click **Products** in the left sidebar
2. Click **Add product**

**Create the Pro plan:**
- Name: `Pro`
- Billing: Recurring
- Monthly price: `$19.00` / month → **Add price** → copy the **Price ID** (starts with `price_`) → paste into `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID`
- Yearly price: Add another price → `$180.00` / year → copy the Price ID → paste into `NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID`

**Create the Team plan:**
- Name: `Team`  
- Monthly price: `$49.00` / month → copy Price ID → paste into `NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID`
- Yearly price: `$468.00` / year → copy Price ID → paste into `NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID`

> **Important:** These are PRICE IDs (price_xxx), not PRODUCT IDs (prod_xxx).
> You want the price_xxx values from the pricing table, not the product page.

### 5c. Configure the Customer Portal

This is the self-service dashboard where users manage their subscription.
You must configure it before the "Manage billing" button will work.

1. In Stripe Dashboard, go to **Settings** → **Billing** → **Customer portal**
2. Under **Functionality**, enable:
   - ✅ Cancel subscriptions
   - ✅ Upgrade/downgrade subscriptions  
   - ✅ Update payment methods
   - ✅ View invoice history
3. Under **Products**, add both your Pro and Team products so users can switch between them
4. Click **Save changes**

---

## Step 6 — Set up webhook handling (local dev)

Webhooks are how Stripe tells your app when something happens (payment succeeded, subscription canceled, etc.). You need this working before you can test any billing flow end-to-end.

### 6a. Install the Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
Download the installer from [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

**Linux:**
```bash
# Debian/Ubuntu
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe
```

### 6b. Log in to the Stripe CLI

```bash
stripe login
```

A browser window will open. Authorize the CLI with your Stripe account.

### 6c. Start the webhook listener

In a separate terminal (keep your dev server running in another):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_abc123... (^C to quit)
```

Copy the `whsec_...` value → paste into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

> **Note:** This secret changes each time you run `stripe listen`. You'll need to
> update `.env.local` if you restart it in a new terminal session.
> Production uses a permanent secret from the Stripe Dashboard.

### 6d. Keep both terminals running

You now need two terminals running simultaneously during development:
- Terminal 1: `npm run dev` (your Next.js app)
- Terminal 2: `stripe listen --forward-to localhost:3000/api/stripe/webhooks`

---

## Step 7 — Configure your plan tiers

Open `lib/billing/plans.ts`. This is the file you'll edit most.

By default, it defines `free`, `pro`, and `team` tiers. Customize:
- Plan names and descriptions
- Feature lists (what's shown in the pricing table)
- Limits (enforced by `gates.ts`)
- Price amounts (display only — actual prices are in Stripe)

The `FEATURE_MAP` in `lib/billing/gates.ts` controls which features require which plan.
Add new entries there when you add gated features to your app.

---

## Step 8 — Add the billing page to your app

The kit ships a complete `/billing` page at `app/(dashboard)/billing/page.tsx`.

If you're not using a `(dashboard)` route group, move it to `app/billing/page.tsx`.

Make sure users can navigate to it — add a "Billing" link in your sidebar or settings nav.

---

## Step 9 — Initialize subscription rows for new users

When a new user signs up, create a free-tier subscription row for them so the app
always has a row to read from.

**Using the default Supabase Auth adapter:**
This is handled automatically in `app/auth/callback/route.ts`. It calls
`getOrCreateCustomer` and `ensureSubscriptionRow` on every successful email
confirmation, so every user gets a billing record on their first login.

**Using a different auth provider:**
Wire this into your provider's new-user hook with the same two calls:

```typescript
import { ensureSubscriptionRow } from '@/lib/billing/sync'
import { getOrCreateCustomer } from '@/lib/stripe/portal'

// After user creation (Clerk webhook, NextAuth events.signIn, Auth0 Action, etc.):
const stripeCustomerId = await getOrCreateCustomer(user.id, user.email)
await ensureSubscriptionRow(user.id, stripeCustomerId)
```

See the setup notes in each adapter file in `lib/auth/adapters/` for provider-specific guidance.

---

## Step 10 — Test the full flow

With both terminals running (dev server + stripe listen):

1. Navigate to `/billing` in your app
2. Click any paid plan's "Get Pro" button
3. You'll be redirected to Stripe's test checkout page
4. Use test card: `4242 4242 4242 4242` / any future expiry / any CVC
5. Complete checkout
6. Watch your webhook terminal — you should see:
   ```
   --> checkout.session.completed [evt_xxx]
   <-- [200] POST http://localhost:3000/api/stripe/webhooks
   --> customer.subscription.created [evt_xxx]
   <-- [200] POST http://localhost:3000/api/stripe/webhooks
   ```
7. You'll be redirected back to `/billing?checkout=success`
8. The page should show your new plan

If the webhook terminal shows `[200]` responses, everything is working. See
[TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if you're seeing errors.

---

## Step 10b — Run the unit tests (optional but recommended)

The kit ships unit tests for all billing logic. Run them to confirm nothing is broken
before wiring up the UI:

```bash
npm test
```

This runs vitest against `tests/billing/` — no database or Stripe connection required.
All 40 tests should pass. E2E tests require a running dev server: `npm run test:e2e`.

---

## Step 11 — Production deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete production checklist,
including setting up the production webhook endpoint in Stripe.

---

## Quick reference: test cards

| Card number           | Behavior                        |
|-----------------------|---------------------------------|
| 4242 4242 4242 4242   | Always succeeds                 |
| 4000 0025 0000 3155   | Requires 3D Secure auth         |
| 4000 0000 0000 9995   | Always declines (insufficient funds) |
| 4000 0000 0000 0341   | Attaches but payment always fails |

Use expiry `12/34`, CVC `123`, any zip for all test cards.
