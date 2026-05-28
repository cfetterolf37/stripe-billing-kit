/**
 * Stripe Client
 *
 * Single Stripe instance for the entire server-side application.
 * Never import the Stripe SDK directly elsewhere — always use this.
 *
 * This file is server-only. The `stripe` object must never reach the client
 * bundle since it holds your secret key.
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    'Missing STRIPE_SECRET_KEY environment variable. ' +
    'Add it to .env.local — see .env.example for reference.'
  )
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-05-27.dahlia',
  typescript: true,
  // Retries failed requests up to 2 times with exponential backoff.
  // This handles transient Stripe API errors gracefully.
  maxNetworkRetries: 2,
})
