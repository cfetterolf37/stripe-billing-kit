/**
 * Auth Adapter — NextAuth (Auth.js)
 *
 * Usage:
 *   1. npm install next-auth
 *   2. Copy this file to lib/auth/index.ts (replace the Supabase default)
 *   3. Create app/api/auth/[...nextauth]/route.ts with your authOptions
 *   4. Add NEXTAUTH_SECRET and NEXTAUTH_URL to .env.local
 *
 * New-user billing init:
 *   Use NextAuth's `events.signIn` callback for new user detection:
 *
 *   events: {
 *     async signIn({ user, isNewUser }) {
 *       if (isNewUser && user.id && user.email) {
 *         const customerId = await getOrCreateCustomer(user.id, user.email)
 *         await ensureSubscriptionRow(user.id, customerId)
 *       }
 *     }
 *   }
 *
 * IMPORTANT: The session must include user.id. Add a session callback:
 *
 *   callbacks: {
 *     session({ session, token }) {
 *       if (token.sub) session.user.id = token.sub
 *       return session
 *     }
 *   }
 */

import type { AuthUser } from '@/lib/auth/index'

// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function getCurrentUser(): Promise<AuthUser | null> {
  // const session = await getServerSession(authOptions)
  // if (!session?.user?.id || !session.user.email) return null
  // return {
  //   id: session.user.id,
  //   email: session.user.email,
  // }
  throw new Error('NextAuth adapter: uncomment the implementation and install next-auth')
}
