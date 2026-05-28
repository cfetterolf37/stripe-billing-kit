/**
 * Auth Layout
 * Shared layout for /login and /signup routes.
 * Centers the form card on the page.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
