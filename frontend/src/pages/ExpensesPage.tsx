import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { CheckCircleIcon, PlusIcon, ReceiptIcon, TrashIcon } from '../components/Icons'
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

const FILTER_OPTIONS = ['All', ...CATEGORIES] as const

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

  // Each member keeps the same avatar colour everywhere, based on their position in the trip.
  const memberIndex = useMemo(() => {
    const indexes = new Map(members.map((m, i) => [m.id, i]))
    return (id: string) => indexes.get(id) ?? members.length
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
  const tripTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  // Scales the balance bars: the largest balance, either way, fills its bar.
  const largestBalance = Math.max(1, ...members.map((m) => Math.abs(balances[m.id] ?? 0)))

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
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-subtitle">Who paid for what, and who owes whom.</p>
        </div>
        <Link to="/expenses/new" className="button button-primary">
          <PlusIcon />
          Add expense
        </Link>
      </div>

      <div role="status">
        {message && (
          <p className="flash">
            <CheckCircleIcon />
            {message}
          </p>
        )}
      </div>

      <dl className="stats">
        <div className="card stat">
          <dt>Trip total</dt>
          <dd>{formatINR(tripTotal)}</dd>
        </div>
        <div className="card stat">
          <dt>Expenses</dt>
          <dd>{expenses.length}</dd>
        </div>
        <div className="card stat">
          <dt>Members</dt>
          <dd>{members.length}</dd>
        </div>
      </dl>

      <section aria-labelledby="balances-heading" className="section">
        <div className="section-header">
          <h2 id="balances-heading">Balances</h2>
          <p className="section-note">Across every expense, whatever the filter</p>
        </div>
        <ul className="balance-list">
          {members.map((m, i) => {
            const balance = balances[m.id] ?? 0
            const status = balanceStatus(balance)
            const barWidth = `${(Math.abs(balance) / largestBalance) * 100}%`
            return (
              <li key={m.id} className={`card balance balance-${status.kind}`}>
                <Avatar name={m.name} index={i} />
                <div className="balance-body">
                  <span className="balance-name">{m.name}</span>{' '}
                  <span className="balance-status">{describeBalance(status)}</span>
                  <span className="balance-bar" aria-hidden="true">
                    <span style={{ width: barWidth }} />
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="expenses-heading" className="section">
        <div className="section-header">
          <h2 id="expenses-heading" ref={expensesHeading} tabIndex={-1}>
            All expenses
          </h2>
        </div>

        <div className="card table-card">
          {expenses.length === 0 ? (
            <div className="empty-state">
              <ReceiptIcon />
              <h3>No expenses yet</h3>
              <p>Add what someone paid for and choose how to split it. Balances appear here.</p>
              <Link to="/expenses/new" className="button button-primary">
                <PlusIcon />
                Add the first expense
              </Link>
            </div>
          ) : (
            <>
              <div className="table-toolbar">
                <fieldset className="filter">
                  <legend>Category</legend>
                  <div className="filter-options">
                    {FILTER_OPTIONS.map((c) => (
                      <label key={c} className="filter-option">
                        <input
                          type="radio"
                          name="category-filter"
                          value={c}
                          checked={category === c}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="filtered-total" aria-live="polite">
                  {category === 'All' ? 'Total' : `${category} total`}:{' '}
                  <strong>{formatINR(filteredTotal)}</strong> ({visible.length}{' '}
                  {visible.length === 1 ? 'expense' : 'expenses'})
                </p>
              </div>

              {visible.length === 0 ? (
                <div className="empty-state">
                  <ReceiptIcon />
                  <h3>No {category} expenses yet</h3>
                  <p>Nothing in this category so far. Pick another one, or show everything.</p>
                  <button type="button" onClick={() => handleCategoryChange('All')}>
                    Show all categories
                  </button>
                </div>
              ) : (
                // Below 720px the CSS turns each row into a card, using data-label as the field name.
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
                        <td data-label="Category">
                          <span className={`chip chip-${e.category.toLowerCase()}`}>{e.category}</span>
                        </td>
                        <td data-label="Paid by">
                          <span className="person">
                            <Avatar name={memberName(e.paidBy)} index={memberIndex(e.paidBy)} size="sm" />
                            {memberName(e.paidBy)}
                          </span>
                        </td>
                        <td data-label="Amount" className="num">
                          {formatINR(e.amount)}
                        </td>
                        <td data-label="Split" className="split">
                          {describeSplit(e.split)}
                        </td>
                        <td className="actions">
                          <button
                            type="button"
                            className="button-danger"
                            aria-label={`Delete ${e.description}`}
                            onClick={() => handleDelete(e)}
                          >
                            <TrashIcon />
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
        </div>
      </section>
    </>
  )
}
