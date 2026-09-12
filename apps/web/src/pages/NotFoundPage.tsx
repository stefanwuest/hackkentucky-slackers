import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="empty-state page-not-found">
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
      <Link
        to="/renewals"
        className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-all"
      >
        Go to renewals
      </Link>
    </section>
  )
}
