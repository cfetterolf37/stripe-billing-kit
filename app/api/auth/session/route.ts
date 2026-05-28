/**
 * GET /api/auth/session
 *
 * Returns the current user's ID and email, or 401 if not authenticated.
 * Used by client-side hooks so they don't need to know the auth provider.
 *
 * Response: { id: string, email: string } | { error: string }
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ id: user.id, email: user.email })
}
