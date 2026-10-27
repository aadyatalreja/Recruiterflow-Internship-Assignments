import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function addedFrom(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'added' in state) {
    const { added } = state
    if (typeof added === 'string') return added
  }
  return null
}

export default function ExpensesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // Copy the message out of history state once, then clear it so a reload doesn't repeat it.
  const [added] = useState(() => addedFrom(location.state))

  useEffect(() => {
    if (addedFrom(location.state) !== null) {
      void navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  return (
    <>
      <h1>Expenses</h1>
      <div role="status">{added && <p className="flash">Added “{added}”.</p>}</div>
    </>
  )
}
