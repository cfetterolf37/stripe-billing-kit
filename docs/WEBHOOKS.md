# Webhooks Guide

Everything you need to know about testing and debugging Stripe webhooks.

---

## Why webhooks matter

Webhooks are the backbone of the billing system. When a user subscribes, upgrades,
cancels, or has a failed payment — Stripe sends an HTTP POST to your webhook endpoint.
Your app processes it and updates the database.

Without working webhooks, your database will never know what happened in Stripe.

---

## Local development setup

### The Stripe CLI listener

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

This command:
1. Opens a persistent connection to Stripe's servers
2. Forwards every webhook event to your local app
3. Prints each event + your response status in real time

Keep it running in a dedicated terminal whenever you're testing billing.

### Triggering test events manually

Instead of going through full checkout, you can fire specific events:

```bash
# Trigger a successful checkout
stripe trigger checkout.session.completed

# Trigger subscription update
stripe trigger customer.subscription.updated

# Trigger payment failure
stripe trigger invoice.payment_failed

# Trigger subscription cancellation
stripe trigger customer.subscription.deleted
```

> **Note:** Triggered events use synthetic data — there's no real subscription_id
> or customer_id attached to your database. Use them to test your handler logic,
> but test the full checkout flow for end-to-end validation.

### Replay a specific event

If a webhook failed and you want to retry it:

```bash
# List recent events
stripe events list --limit 10

# Replay a specific event by ID
stripe events resend evt_xxx
```

---

## The webhook endpoint

**File:** `app/api/stripe/webhooks/route.ts`

### Why we use `req.text()` instead of `req.json()`

Stripe verifies webhook authenticity by signing the raw request body.
If you parse the body as JSON first, the raw bytes change and signature verification fails.

The webhook route reads the body as plain text:
```typescript
const payload = await req.text()
```

Never change this to `req.json()`.

### Signature verification

Every incoming request is verified before any handler runs:

```typescript
const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
```

If the signature doesn't match, the request is rejected with a 400. This prevents
anyone from sending fake webhook events to your endpoint.

### Response codes matter

Stripe uses your HTTP response code to decide whether to retry:

| Your response | Stripe behavior                           |
|---------------|-------------------------------------------|
| 200           | Event delivered successfully — no retry   |
| 400           | Bad request — Stripe does NOT retry       |
| 5xx           | Server error — Stripe retries for 3 days  |

The webhook handler returns 200 for all successfully processed events (including
unhandled event types — returning 200 tells Stripe to stop retrying).

---

## Handled events

### `checkout.session.completed`

Fires when a user completes the Stripe Checkout flow. This is the primary event
that links a Stripe customer to your Supabase user via `metadata.user_id`.

**What the handler does:**
1. Reads `session.metadata.user_id` (set during checkout session creation)
2. Retrieves the full subscription object from Stripe
3. Upserts the subscription row in Supabase with `user_id` + all subscription fields

**Common issue:** If `user_id` is missing from `session.metadata`, the handler logs
an error and returns early. Make sure `createCheckoutSession` is always called with
a valid `userId`.

### `customer.subscription.created` / `updated`

Fires when Stripe creates or modifies a subscription. Common triggers:
- Subscription first created (often fires alongside `checkout.session.completed`)
- Plan upgrade or downgrade
- Subscription renewal (period dates update)
- Cancellation set (`cancel_at_period_end` flips to true)
- Trial ending (status changes from `trialing` to `active`)

**What the handler does:** Calls `syncSubscription()` which upserts all subscription
fields including the current plan, status, period dates, and cancellation state.

### `customer.subscription.deleted`

Fires when a subscription is actually deleted (not just set to cancel at period end).
This is the event that actually removes access.

**What the handler does:** Sets `plan = 'free'`, `status = 'canceled'`,
`stripe_subscription_id = null`, `cancel_at_period_end = false`.

### `invoice.payment_succeeded`

Fires after a successful recurring payment. Retrieves the subscription and syncs
the updated period dates.

**Note:** As of Stripe API version `2026-05-27.dahlia`, the subscription ID lives at
`invoice.parent.subscription_details.subscription` (not `invoice.subscription`).
The kit handles this automatically in `getSubscriptionIdFromInvoice()`.

### `invoice.payment_failed`

Fires when a payment attempt fails. Stripe will retry automatically according to
your retry settings (Stripe Dashboard → Settings → Billing → Subscriptions and emails).

The subscription status becomes `past_due`. Your UI should prompt users to update
their payment method. The `SubscriptionStatus` component handles this automatically.

---

## Production webhook setup

1. Deploy your app to production
2. Go to Stripe Dashboard → **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your endpoint URL: `https://yourdomain.com/api/stripe/webhooks`
5. Under **Select events**, choose:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.deleted`
6. Click **Add endpoint**
7. On the endpoint detail page, click **Reveal** under **Signing secret**
8. Copy the `whsec_...` value → add to your production environment as `STRIPE_WEBHOOK_SECRET`

> **Important:** The production webhook secret is different from the local `stripe listen` secret.
> They start with `whsec_` but the values are different. Make sure you're using the right one
> in each environment.

---

## Debugging checklist

**Webhook not being called at all:**
- Is `stripe listen` running? Check the terminal.
- Is your dev server running on port 3000? Check `--forward-to` matches your port.
- Is the URL correct? `localhost:3000/api/stripe/webhooks` with no trailing slash.

**Getting 400 — signature verification failed:**
- Did you copy the `whsec_...` from the `stripe listen` output into `.env.local`?
- Did you restart your dev server after updating `.env.local`? (`npm run dev`)
- Is `STRIPE_WEBHOOK_SECRET` spelled exactly right in `.env.local`?
- Are you running `stripe listen` in the same terminal session where you copied the secret?
  The secret changes each time you start a new `stripe listen` session.

**Getting 500 — handler error:**
- Check your dev server terminal for the full error stack trace.
- Most common cause: Supabase credentials are wrong or the migration hasn't been run.
- Run `supabase db push` and verify the `subscriptions` table exists.

**Webhook fires but database doesn't update:**
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly in `.env.local`.
- The service role key is needed because webhook handlers bypass RLS.
- Common mistake: using the anon key instead of the service role key.

**`user_id` is null in checkout session:**
- Make sure the user is authenticated before calling `/api/stripe/checkout`.
- The checkout route reads `user.id` from `getCurrentUser()` in `lib/auth`.
- If you're testing while not logged in, or if your auth adapter returns null, this will fail.
