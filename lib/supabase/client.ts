/**
 * Supabase Browser Client
 *
 * Use this in Client Components and client-side hooks.
 * It uses the anon key and respects Row Level Security.
 *
 * For Server Components and API routes, use `createServerClient` from
 * @/lib/supabase/server instead.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
