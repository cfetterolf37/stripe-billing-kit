/**
 * Auth Adapter — Auth0 (via @auth0/nextjs-auth0)
 *
 * Usage:
 *   1. npm install @auth0/nextjs-auth0
 *   2. Copy this file to lib/auth/index.ts (replace the Supabase default)
 *   3. Add app/api/auth/[auth0]/route.ts:
 *        export { GET, POST } from '@auth0/nextjs-auth0'
 *   4. Add AUTH0_SECRET, AUTH0_BASE_URL, AUTH0_ISSUER_BASE_URL,
 *      AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET to .env.local
 *
 * New-user billing init:
 *   Use an Auth0 Action on the "Post Login" trigger:
 *
 *   exports.onExecutePostLogin = async (event, api) => {
 *     if (event.stats.logins_count !== 1) return  // only first login
 *     // Call your Next.js API route to initialize billing for this user.
 *     // The API route calls getOrCreateCustomer() + ensureSubscriptionRow().
 *   }
 *
 * The user.sub from Auth0 is the user ID. Store it in subscriptions.user_id.
 */

import type { AuthUser } from '@/lib/auth/index'

// import { getSession } from '@auth0/nextjs-auth0'

export async function getCurrentUser(): Promise<AuthUser | null> {
  // const session = await getSession()
  // if (!session?.user) return null
  // return {
  //   id: session.user.sub,
  //   email: session.user.email ?? '',
  // }
  throw new Error('Auth0 adapter: uncomment the implementation and install @auth0/nextjs-auth0')
}
