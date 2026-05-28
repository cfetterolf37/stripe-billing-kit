import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

/**
 * Root page — redirects authenticated users to /dashboard,
 * unauthenticated users to /login.
 *
 * Replace this with your own landing page if needed.
 */
export default async function RootPage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
