import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { balanceStatus, computeBalances, type BalanceStatus } from '../domain/balances'
import { formatINR } from '../domain/money'
import { describeSplit } from '../domain/split'
import { CATEGORIES, isCategory, type Expense } from '../domain/types'
import { deleteExpense } from '../store/expensesSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'

function addedFrom(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'added' in state) {
    const { added } = state
    if (typeof added === 'string') return added
  }
  return null
}

function describeBalance(status: BalanceStatus): string {
  switch (status.kind) {
    case 'gets_back':
      return `gets back ${formatINR(status.amount)}`
    case 'owes':
      return `owes ${formatINR(status.amount)}`
    case 'settled':
      return 'settled up'
  }
}

/** "2026-03-12" -> "12 Mar 2026", formatted from the parts so no time zone can shift the day. */
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return isoDate
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Newest date first; expenses on the same day keep most-recently-added first. */
function sortNewestFirst(expenses: readonly Expense[]): Expense[] {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .sort((a, b) => b.expense.date.localeCompare(a.expense.date) || b.index - a.index)
    .map(({ expense }) => expense)
}

export default function ExpensesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const members = useAppSelector((state) => state.expenses.members)
  const expenses = useAppSelector((state) => state.expenses.expenses)

  // The filter lives in the URL so it survives going to Add expense and back.
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') ?? ''
  const category = isCategory(categoryParam) ? categoryParam : 'All'

  // Copy the message out of history state once, then clear it so a reload doesn't repeat it.
  const [message, setMessage] = useState(() => {
    const added = addedFrom(location.state)
    return added === null ? null : `Added “${added}”.`
  })

  useEffect(() => {
    if (addedFrom(location.state) !== null) {
      void navigate({ pathname: location.pathname, search: location.search }, {
        replace: true,
        state: null,
      })
    }
  }, [location.state, location.pathname, location.search, navigate])

  const memberName = useMemo(() => {
    const names = new Map(members.map((m) => [m.id, m.name]))
    return (id: string) => names.get(id) ?? 'Unknown member'
  }, [members])

  // Balances always cover every expense; the category filter only affects the table.
  const balances = useMemo(() => computeBalances(members, expenses), [members, expenses])

  const visible = useMemo(() => {
    const sorted = sortNewestFirst(expenses)
    return category === 'All' ? sorted : sorted.filter((e) => e.category === category)
  }, [expenses, category])

  // The deleted row's button disappears, so give focus a stable place to land.
  const expensesHeading = useRef<HTMLHeadingElement>(null)

  const filteredTotal = visible.reduce((sum, e) => sum + e.amount, 0)

  function handleCategoryChange(value: string) {
    setSearchParams(isCategory(value) ? { category: value } : {}, { replace: true })
  }

  function handleDelete(expense: Expense) {
    const confirmed = window.confirm(
      `Delete “${expense.description}” (${formatINR(expense.amount)})? This can't be undone.`,
    )
    if (!confirmed) return
    dispatch(deleteExpense(expense.id))
    setMessage(`Deleted “${expense.description}”.`)
    expensesHeading.current?.focus()
  }

  return (
    <>
      <h1>Expenses</h1>
      <div role="status">{message && <p className="flash">{message}</p>}</div>

      <section aria-labelledby="balances-heading" className="section">
        <h2 id="balances-heading">Balances</h2>
        <ul className="balance-list">
          {members.map((m) => {
            const status = balanceStatus(balances[m.id] ?? 0)
            return (
              <li key={m.id} className={`balance balance-${status.kind}`}>
                <span className="balance-name">{m.name}</span>{' '}
                <span className="balance-status">{describeBalance(status)}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="expenses-heading" className="section">
        <h2 id="expenses-heading" ref={expensesHeading} tabIndex={-1}>
          All expenses
        </h2>

        {expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses yet.</p>
            <Link to="/expenses/new">Add the first expense</Link>
          </div>
        ) : (
          <>
            <div className="table-toolbar">
              <div className="field field-inline">
                <label htmlFor="category-filter">Category</label>
                <select
                  id="category-filter"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="All">All</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <p className="filtered-total" aria-live="polite">
                {category === 'All' ? 'Total' : `${category} total`}:{' '}
                <strong>{formatINR(filteredTotal)}</strong>
                <span className="muted">
                  {' '}
                  ({visible.length} {visible.length === 1 ? 'expense' : 'expenses'})
                </span>
              </p>
            </div>

            {visible.length === 0 ? (
              <div className="empty-state">
                <p>No {category} expenses yet.</p>
                <button type="button" onClick={() => handleCategoryChange('All')}>
                  Show all categories
                </button>
              </div>
            ) : (
              // Below 640px the CSS turns each row into a card, using data-label as the field name.
              <table className="expense-table">
                <caption className="visually-hidden">
                  Expenses{category === 'All' ? '' : ` in ${category}`}, newest first
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Description</th>
                    <th scope="col">Category</th>
                    <th scope="col">Paid by</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                    <th scope="col">Split</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((e) => (
                    <tr key={e.id}>
                      <td data-label="Date">
                        <time dateTime={e.date}>{formatDate(e.date)}</time>
                      </td>
                      <td data-label="Description" className="description">
                        {e.description}
                      </td>
                      <td data-label="Category">{e.category}</td>
                      <td data-label="Paid by">{memberName(e.paidBy)}</td>
                      <td data-label="Amount" className="num">
                        {formatINR(e.amount)}
                      </td>
                      <td data-label="Split">{describeSplit(e.split)}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="button-danger"
                          aria-label={`Delete ${e.description}`}
                          onClick={() => handleDelete(e)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </>
  )
}
