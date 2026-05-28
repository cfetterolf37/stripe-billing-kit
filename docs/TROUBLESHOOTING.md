# Troubleshooting

Indexed by error message or symptom. Search this page before opening a support request.

---

## Webhook errors

### "Missing STRIPE_WEBHOOK_SECRET"

**Cause:** The env var isn't set or the dev server hasn't been restarted since setting it.

**Fix:**
1. Make sure `.env.local` contains `STRIPE_WEBHOOK_SECRET=whsec_...`
2. Stop and restart `npm run dev` — Next.js doesn't hot-reload env vars
3. Confirm the value came from `stripe listen` output in your current terminal session

---

### "No signatures found matching the expected signature for payload"

**Cause:** Stripe signature verification failed. Almost always one of three things:

**Fix A:** Wrong webhook secret. The `stripe listen` secret changes every session.
Re-copy it from the terminal running `stripe listen`.

**Fix B:** Body was parsed before verification. If you modified the webhook route
to use `req.json()` instead of `req.text()`, the raw body is corrupted. Revert to `req.text()`.

**Fix C:** A proxy or middleware is modifying the request body. Make sure no middleware
transforms the `/api/stripe/webhooks` request.

---

### Webhook returns 200 but database doesn't update

**Cause:** Handler ran successfully but the Supabase write failed silently.

**Fix:**
1. Check your Next.js server logs for `[sync] Failed to sync...` messages
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is the **service_role** key, not the anon key
3. Confirm the migrations have been run: the `subscriptions` table must exist
4. Check that `stripe_customer_id` and `user_id` unique constraints aren't being violated

---

### `checkout.session.completed` fires but user_id is missing

**Cause:** The user wasn't authenticated when `/api/stripe/checkout` was called,
so `user.id` couldn't be added to `session.metadata`.

**Fix:** Ensure users are authenticated before reaching the pricing table. Redirect
unauthenticated users to `/login` before showing upgrade buttons.

---

## Checkout errors

### "Failed to create checkout session" (500)

**Cause:** Stripe API call failed. Check the server logs for the specific Stripe error.

**Common Stripe errors:**
- `No such price` — The price ID in your env vars doesn't exist in your Stripe account.
  Make sure you're using test mode price IDs with a test mode secret key (and vice versa for live).
- `Invalid API Key` — Wrong `STRIPE_SECRET_KEY`. Don't mix test/live keys.

---

### Checkout page shows "Something went wrong"

**Cause:** Usually an invalid or mismatched price ID.

**Fix:** In Stripe Dashboard, verify the price IDs you've set in `.env.local` exist
under Products → your product → Prices.

---

## Portal errors

### "No billing account found"

**Cause:** The user has no `stripe_customer_id` in the database.

**This is expected** for free users who have never subscribed. The `ManageBillingButton`
component returns `null` if no customer ID exists, so it won't render at all for them.

If a paying user sees this: check the `subscriptions` table — their `stripe_customer_id`
should be populated. If it's missing, the `checkout.session.completed` webhook may have
failed to write it. Re-trigger the event: `stripe events resend evt_xxx`.

---

## Supabase errors

### "relation 'subscriptions' does not exist"

**Cause:** The migrations haven't been run.

**Fix:**
```bash
supabase db push
```
Or manually run both SQL files in the Supabase SQL Editor.

---

### "new row violates row-level security policy"

**Cause:** Your code is trying to insert/update without a valid authenticated session,
or a webhook handler is using the anon key instead of the service role key.

**Fix:**
- In billing reads: use `getSubscription()` — it calls `getCurrentUser()` internally
  and queries via the service client
- In webhook handlers: always use `createServiceClient()` (service role key, bypasses RLS)
- In auth-level checks (layouts, route guards): use `getCurrentUser()` from `lib/auth`
- Never use the browser `createClient()` in server-side code

---

### useSubscription returns stale data after checkout

**Cause:** Realtime isn't enabled for the `subscriptions` table.

**Fix:**
1. In Supabase Dashboard → Database → Replication
2. Enable the `subscriptions` table
3. Or run: `ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;`

The `useSubscription` hook sets up a Postgres changes listener. Without Realtime enabled,
it only fetches once on mount and won't receive webhook-triggered updates.

---

## Auth adapter errors

### `getCurrentUser()` always returns null

**Cause:** Your auth adapter is not reading the session correctly.

**Fix:**
- Default Supabase adapter: confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, and that `middleware.ts` is present (it refreshes the session cookie on every request).
- Clerk adapter: confirm `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set, and your app is wrapped in `<ClerkProvider>`.
- NextAuth adapter: confirm `NEXTAUTH_SECRET` is set, and the session callback is returning `session.user.id`.
- Auth0 adapter: confirm `AUTH0_*` env vars are set and `getSession()` is being called from a server context.

---

### Billing works but new users have no subscription row

**Cause:** The new-user billing initialization hook isn't wired up for your auth provider.

**Fix:** See Step 9 in [SETUP.md](./SETUP.md). For non-Supabase providers, you must
call `getOrCreateCustomer` + `ensureSubscriptionRow` in your provider's new-user event
(Clerk webhook, NextAuth `events.signIn`, Auth0 Action). The default Supabase adapter
handles this automatically in `app/auth/callback/route.ts`.

---

## TypeScript errors

### "Argument of type 'string' is not assignable to parameter of type 'FeatureKey'"

**Cause:** You're passing an unchecked string where a `FeatureKey` is expected.

**Fix:** Make sure the feature key you're using exists in `FEATURE_MAP` in `gates.ts`.
TypeScript is catching a likely typo or a feature that hasn't been added to the map yet.

---

### "Type 'null' is not assignable to type 'string'"

**Cause:** `monthlyPriceId` or `yearlyPriceId` can be `null` for the free plan.

**Fix:** Check for null before using:
```typescript
const priceId = plan.monthlyPriceId
if (!priceId) return
```
