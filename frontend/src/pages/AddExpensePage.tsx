import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, type SplitType } from '../domain/types'
import {
  MAX_DESCRIPTION_LENGTH,
  buildExpense,
  shareErrorKey,
  validateExpenseForm,
  type ExpenseFormValues,
  type FormErrors,
} from '../domain/validation'
import { addExpense } from '../store/expensesSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'

/** Today as YYYY-MM-DD in the user's local time zone (toISOString would use UTC). */
function localToday(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const SPLIT_LABELS: Record<SplitType, string> = {
  equal: 'Equally',
  exact: 'Exact amounts',
  percent: 'Percentages',
}

/** Message rendered right after a field; its id is referenced by aria-describedby. */
function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  )
}

/** aria props tying an input to its error message, when there is one. */
function errorProps(errors: FormErrors, key: string, errorId: string) {
  return errors[key]
    ? { 'aria-invalid': true as const, 'aria-describedby': errorId }
    : { 'aria-invalid': false as const }
}

export default function AddExpensePage() {
  const members = useAppSelector((state) => state.expenses.members)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const today = localToday()

  const [values, setValues] = useState<ExpenseFormValues>(() => ({
    description: '',
    amount: '',
    paidBy: '',
    date: today,
    category: '',
    splitType: 'equal',
    equalMemberIds: members.map((m) => m.id),
    exactShares: {},
    percentShares: {},
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  // Errors only appear after the first Save; from then on they update as the user types.
  const [submitted, setSubmitted] = useState(false)

  function update(patch: Partial<ExpenseFormValues>) {
    const next = { ...values, ...patch }
    setValues(next)
    if (submitted) setErrors(validateExpenseForm(next, today))
  }

  function toggleEqualMember(memberId: string, checked: boolean) {
    update({
      // Rebuild from `members` so the stored order stays stable regardless of click order.
      equalMemberIds: members
        .map((m) => m.id)
        .filter((id) => (id === memberId ? checked : values.equalMemberIds.includes(id))),
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    const found = validateExpenseForm(values, today)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      // Move focus to the first invalid control so keyboard users land on the problem.
      const form = event.currentTarget
      requestAnimationFrame(() => {
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }

    const expense = buildExpense(values, crypto.randomUUID())
    dispatch(addExpense(expense))
    void navigate('/', { state: { added: expense.description } })
  }

  const shareInputs = values.splitType === 'exact' ? values.exactShares : values.percentShares
  const sharesField = values.splitType === 'exact' ? 'exactShares' : 'percentShares'

  return (
    <>
      <h1>Add expense</h1>
      <form className="expense-form" noValidate onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            value={values.description}
            onChange={(e) => update({ description: e.target.value })}
            {...errorProps(errors, 'description', 'description-error')}
          />
          <p className="field-hint">Up to {MAX_DESCRIPTION_LENGTH} characters</p>
          <FieldError id="description-error" message={errors.description} />
        </div>

        <div className="field">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => update({ amount: e.target.value })}
            {...errorProps(errors, 'amount', 'amount-error')}
          />
          <FieldError id="amount-error" message={errors.amount} />
        </div>

        <div className="field">
          <label htmlFor="paidBy">Paid by</label>
          <select
            id="paidBy"
            value={values.paidBy}
            onChange={(e) => update({ paidBy: e.target.value })}
            {...errorProps(errors, 'paidBy', 'paidBy-error')}
          >
            <option value="">Choose a member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <FieldError id="paidBy-error" message={errors.paidBy} />
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            max={today}
            value={values.date}
            onChange={(e) => update({ date: e.target.value })}
            {...errorProps(errors, 'date', 'date-error')}
          />
          <FieldError id="date-error" message={errors.date} />
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={values.category}
            onChange={(e) => update({ category: e.target.value })}
            {...errorProps(errors, 'category', 'category-error')}
          >
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError id="category-error" message={errors.category} />
        </div>

        <fieldset className="field">
          <legend>Split</legend>
          <div className="radio-row">
            {(Object.keys(SPLIT_LABELS) as SplitType[]).map((type) => (
              <label key={type} className="inline-label">
                <input
                  type="radio"
                  name="splitType"
                  value={type}
                  checked={values.splitType === type}
                  onChange={() => update({ splitType: type })}
                />
                {SPLIT_LABELS[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset
          className="field"
          aria-describedby={errors.split ? 'split-error' : undefined}
          aria-invalid={errors.split ? true : undefined}
        >
          <legend>
            {values.splitType === 'equal'
              ? 'Split between'
              : values.splitType === 'exact'
                ? 'Amount per member (₹) — leave blank to exclude'
                : 'Percentage per member — leave blank to exclude'}
          </legend>

          {values.splitType === 'equal' ? (
            <div className="member-list">
              {members.map((m) => (
                <label key={m.id} className="inline-label">
                  <input
                    type="checkbox"
                    checked={values.equalMemberIds.includes(m.id)}
                    onChange={(e) => toggleEqualMember(m.id, e.target.checked)}
                    // Focus target when "select at least one member" is the first error.
                    aria-invalid={errors.split ? true : undefined}
                  />
                  {m.name}
                </label>
              ))}
            </div>
          ) : (
            <div className="member-list">
              {members.map((m) => {
                const key = shareErrorKey(m.id)
                const inputId = `${sharesField}-${m.id}`
                return (
                  <div key={m.id} className="share-row">
                    <label htmlFor={inputId}>{m.name}</label>
                    <input
                      id={inputId}
                      type="text"
                      inputMode="decimal"
                      placeholder={values.splitType === 'exact' ? '0.00' : '0'}
                      value={shareInputs[m.id] ?? ''}
                      onChange={(e) =>
                        update({ [sharesField]: { ...shareInputs, [m.id]: e.target.value } })
                      }
                      {...errorProps(errors, key, `${inputId}-error`)}
                    />
                    {values.splitType === 'percent' && <span aria-hidden="true">%</span>}
                    <FieldError id={`${inputId}-error`} message={errors[key]} />
                  </div>
                )
              })}
            </div>
          )}
          <FieldError id="split-error" message={errors.split} />
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="button-primary">
            Save
          </button>
          <button type="button" onClick={() => void navigate('/')}>
            Cancel
          </button>
        </div>
      </form>
    </>
  )
}
