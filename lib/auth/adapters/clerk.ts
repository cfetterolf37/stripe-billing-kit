/**
 * Auth Adapter — Clerk
 *
 * Usage:
 *   1. npm install @clerk/nextjs
 *   2. Copy this file to lib/auth/index.ts (replace the Supabase default)
 *   3. Wrap your app in <ClerkProvider> in app/layout.tsx
 *   4. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to .env.local
 *
 * New-user billing init:
 *   Clerk doesn't have an auth callback route. Use a Clerk webhook instead.
 *   Dashboard → Webhooks → Add endpoint → select "user.created"
 *   In that webhook handler, call getOrCreateCustomer() + ensureSubscriptionRow().
 *
 * The user.id from Clerk must match what you store in subscriptions.user_id.
 * If you are migrating from Supabase Auth, you will need a one-time migration.
 */

import type { AuthUser } from '@/lib/auth/index'

// import { currentUser } from '@clerk/nextjs/server'

export async function getCurrentUser(): Promise<AuthUser | null> {
  // const user = await currentUser()
  // if (!user) return null
  // return {
  //   id: user.id,
  //   email: user.emailAddresses[0]?.emailAddress ?? '',
  // }
  throw new Error('Clerk adapter: uncomment the implementation and install @clerk/nextjs')
}
