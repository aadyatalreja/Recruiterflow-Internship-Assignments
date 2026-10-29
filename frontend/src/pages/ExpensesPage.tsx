import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { CATEGORY_STYLE } from '../components/categoryStyle'
import GlassIcon, { type GlassIconColor } from '../components/GlassIcon'
import PageWindow from '../components/PageWindow'
import PillFilter from '../components/PillFilter/PillFilter'
import SpecularButton from '../components/SpecularButton/SpecularButton'
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  CheckIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
} from '../components/Icons'
import { balanceStatus, computeBalances, type BalanceStatus } from '../domain/balances'
import { formatDate } from '../domain/dates'
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

/** Each balance's glass icon: green money in, red money out, grey when settled. */
const BALANCE_ICONS: Record<BalanceStatus['kind'], { color: GlassIconColor; icon: ReactNode }> = {
  gets_back: { color: 'green', icon: <ArrowDownLeftIcon /> },
  owes: { color: 'red', icon: <ArrowUpRightIcon /> },
  settled: { color: 'graphite', icon: <CheckIcon /> },
}

/** Newest date first; expenses on the same day keep most-recently-added first. */
function sortNewestFirst(expenses: readonly Expense[]): Expense[] {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .sort((a, b) => b.expense.date.localeCompare(a.expense.date) || b.index - a.index)
    .map(({ expense }) => expense)
}

/** Link to the Add expense page: a violet SpecularButton whose edge light follows the cursor. */
function AddExpenseButton({ children }: { children: ReactNode }) {
  return (
    <SpecularButton
      to="/expenses/new"
      size="md"
      radius={14}
      // The violet gradient body comes from .add-expense-cta in index.css.
      className="add-expense-cta"
      textColor="#ffffff"
      lineColor="var(--cta-line)"
      baseColor="var(--brand-to)"
      idleIntensity={0.5}
      proximity={220}
    >
      <PlusIcon />
      {children}
    </SpecularButton>
  )
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
    <PageWindow title="Expenses">
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p className="page-subtitle">Who paid for what, and who owes whom.</p>
        </div>
        <AddExpenseButton>Add expense</AddExpenseButton>
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
                <GlassIcon {...BALANCE_ICONS[status.kind]} index={i} />
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
              <AddExpenseButton>Add the first expense</AddExpenseButton>
            </div>
          ) : (
            <>
              <div className="table-toolbar">
                <PillFilter
                  legend="Category"
                  name="category-filter"
                  options={FILTER_OPTIONS}
                  value={category}
                  onChange={handleCategoryChange}
                />
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
                          <span className="chip">
                            {CATEGORY_STYLE[e.category].icon}
                            {e.category}
                          </span>
                        </td>
                        <td data-label="Paid by">
                          <span className="person">
                            <Avatar name={memberName(e.paidBy)} size="sm" />
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
    </PageWindow>
  )
}
