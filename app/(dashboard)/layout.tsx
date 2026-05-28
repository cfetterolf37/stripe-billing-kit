/**
 * Dashboard Layout
 *
 * Protects all routes inside (dashboard)/.
 * Unauthenticated users are redirected to /login.
 *
 * Renders a minimal sidebar nav with a Billing link.
 * Replace with your own nav component as needed.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-background px-3 py-6 flex flex-col gap-1">
        <div className="px-3 mb-6">
          <span className="text-sm font-semibold tracking-tight">Your App</span>
        </div>

        <NavLink href="/dashboard">Dashboard</NavLink>
        <NavLink href="/billing">Billing</NavLink>

        <div className="mt-auto pt-4 border-t border-border">
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-muted/20">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  )
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="w-full text-left rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        Sign out
      </button>
    </form>
  )
}
