import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="card not-found">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1>Page not found</h1>
      <p>This page doesn’t exist. It may have moved, or the link may be wrong.</p>
      <Link to="/" className="button button-primary">
        Back to Expenses
      </Link>
    </div>
  )
}
