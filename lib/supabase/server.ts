/**
 * Supabase Server Clients
 *
 * Two exports:
 *
 * 1. `createServerClient()` — for Server Components and API routes.
 *    Uses the anon key + user's cookies. Respects RLS.
 *    The authenticated user's permissions apply.
 *
 * 2. `createServiceClient()` — for webhook handlers and admin operations.
 *    Uses the service role key. BYPASSES RLS.
 *    Never expose this to the client or use in Server Components
 *    that render user-specific data.
 */

import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// ─── Authenticated Server Client (uses RLS) ───────────────────────────────────

export async function createServerClient() {
  const cookieStore = await cookies()

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // Middleware handles cookie refresh; this is safe to ignore.
          }
        },
      },
    }
  )
}

// ─── Service Role Client (bypasses RLS) ──────────────────────────────────────

export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. ' +
      'This is required for webhook handlers. Add it to .env.local.'
    )
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
