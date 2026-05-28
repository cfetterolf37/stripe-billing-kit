# Deployment Guide

Checklist for taking the billing integration to production.

---

## Pre-deployment checklist

Complete every item before going live. Check them off in order.

### Environment variables

- [ ] `NEXT_PUBLIC_APP_URL` set to your production domain (e.g., `https://yourdomain.com`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` pointing to your production Supabase project
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` from production Supabase project
- [ ] `SUPABASE_SERVICE_ROLE_KEY` from production Supabase project
- [ ] `STRIPE_SECRET_KEY` using **live mode** key (starts with `sk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` using the **production** webhook signing secret (set in next step)
- [ ] All Stripe Price IDs updated to **live mode** price IDs

### Stripe live mode

- [ ] Switch Stripe Dashboard from Test to Live mode
- [ ] Create products and prices in live mode (they don't carry over from test)
- [ ] Update all `NEXT_PUBLIC_STRIPE_*_PRICE_ID` values to live mode price IDs
- [ ] Configure the Customer Portal in live mode (Settings → Billing → Customer portal)

### Stripe webhook endpoint

1. In Stripe Dashboard (live mode), go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter: `https://yourdomain.com/api/stripe/webhooks`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.deleted`
5. Click **Add endpoint**
6. Click **Reveal** under **Signing secret** → copy `whsec_...`
7. Add to production environment as `STRIPE_WEBHOOK_SECRET`
8. Redeploy so the new env var takes effect

- [ ] Production webhook endpoint created
- [ ] Production `STRIPE_WEBHOOK_SECRET` added to environment
- [ ] App redeployed after adding the secret

### Supabase production setup

- [ ] Migrations applied to production database (`supabase db push` or SQL Editor)
- [ ] RLS is enabled (verify: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'subscriptions'`)
- [ ] Realtime enabled for `subscriptions` table

### Test the production flow

After deploying:

1. Sign up for a real account on your production app
2. Navigate to `/billing`
3. Subscribe to the Pro plan using a real card
4. Verify the subscription row appears in your Supabase production database
5. Open the billing portal and cancel the subscription
6. Verify `cancel_at_period_end` is true in the database
7. Check Stripe Dashboard → Webhooks to confirm all events are being delivered (200 responses)

---

## Deploying to Vercel

Vercel is the recommended platform for Next.js apps.

### Webhook function timeout

The kit ships a `vercel.json` that sets a 30-second timeout on the webhook route:

```json
{
  "functions": {
    "app/api/stripe/webhooks/route.ts": {
      "maxDuration": 30
    }
  }
}
```

This is already in the repo — no action needed. The default Vercel timeout is 10s on
Hobby plans, which can be too short for webhook handlers that retrieve full subscription
objects from Stripe. Upgrade to a Pro plan if you need longer timeouts.

### Setting environment variables in Vercel

1. Go to your project in the Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable from `.env.local`, but use production values
4. Make sure variables that need to be on the server are NOT marked as "Preview" only

### Deploy to Vercel button

Add this to your README to let buyers deploy instantly:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/your-repo&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID,NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID)
```

This opens a one-click deploy flow that prompts for all required env vars.

---

## Common production issues

**Webhooks returning 400 (signature mismatch):**
Most common cause: the `STRIPE_WEBHOOK_SECRET` in production is still the local
`whsec_...` from `stripe listen` instead of the production endpoint's secret.
They look identical but are different values. Re-copy from Stripe Dashboard → Webhooks → your endpoint.

**Checkout redirect not returning to your app:**
Make sure `NEXT_PUBLIC_APP_URL` is set to your exact production URL with no trailing slash.
The success/cancel redirect URLs are built from this value.

**Users upgraded but still showing free plan:**
Webhooks aren't reaching your endpoint. Check Stripe Dashboard → Webhooks → your endpoint
→ Recent deliveries. Look for failed attempts and their error messages.

**Portal returning "No such customer":**
User completed checkout before the webhook wrote their `stripe_customer_id` to the database.
This is a race condition — the portal route checks for the customer ID before it exists.
Stripe usually delivers `checkout.session.completed` within 1-2 seconds of checkout completion.
If it consistently fails, check that your webhook endpoint is responding with 200.
