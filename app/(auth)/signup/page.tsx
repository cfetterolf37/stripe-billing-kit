/**
 * /signup page
 *
 * Creates a Supabase auth user, then initializes:
 * - A Stripe customer (via getOrCreateCustomer)
 * - A free-tier subscription row in Supabase (via ensureSubscriptionRow)
 *
 * This ensures every user has billing state from the moment they sign up,
 * which prevents null-check errors throughout the app.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignup() {
    setLoading(true)
    setError(null)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // After email confirmation, users land here.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.user && !data.session) {
      // Email confirmation required — Supabase is configured to verify emails.
      setSuccess(true)
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation disabled — user is immediately logged in.
      // The /auth/callback route will handle Stripe customer + subscription init.
      router.push('/auth/callback')
      return
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="rounded-xl border border-border bg-background p-8 shadow-sm text-center">
        <div className="mb-4 text-3xl">📬</div>
        <h2 className="text-lg font-semibold mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{email}</strong>.
          Click it to activate your account.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-background p-8 shadow-sm">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get started for free — no credit card required.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={handleSignup}
          disabled={loading || !email || !password}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-primary">
          Sign in
        </Link>
      </p>
    </div>
  )
}
