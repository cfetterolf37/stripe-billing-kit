/**
 * Auth Adapter — Default (Supabase Auth)
 *
 * Exports a single `getCurrentUser()` function used throughout the app.
 * Swap this file with any adapter in lib/auth/adapters/ to change providers.
 *
 * Contract: returns { id, email } for authenticated users, null otherwise.
 * The `id` must be the same value stored in subscriptions.user_id.
 */

import { createServerClient } from '@/lib/supabase/server'

export type AuthUser = {
  id: string
  email: string
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user || !user.email) return null

  return { id: user.id, email: user.email }
}
