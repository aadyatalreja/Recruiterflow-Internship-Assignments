import { formatINR, parsePercentToBasisPoints, parseRupees, type ParseResult } from './money'
import { isCategory, type Expense, type Paise, type Split, type SplitType } from './types'

export const MAX_DESCRIPTION_LENGTH = 60
/** ₹10,00,000 (ten lakh) */
export const MAX_AMOUNT: Paise = 100000000
const FULL_PERCENT_BASIS_POINTS = 10000

/** Raw form state: everything is still a string exactly as typed. */
export interface ExpenseFormValues {
  description: string
  amount: string
  paidBy: string
  /** YYYY-MM-DD, or '' when not picked */
  date: string
  category: string
  splitType: SplitType
  equalMemberIds: string[]
  /** rupee input per member id; blank means the member is not part of the split */
  exactShares: Record<string, string>
  /** percent input per member id; blank means the member is not part of the split */
  percentShares: Record<string, string>
}

/**
 * Field -> message. Keys are the form field names, plus `split` for split-level
 * errors and `share.<memberId>` for a single member's share input.
 */
export type FormErrors = Record<string, string>

export const shareErrorKey = (memberId: string) => `share.${memberId}`

/** Shared wording for the parse failures money.ts can report. */
function parseFailureMessage(result: ParseResult & { ok: false }, what: string): string {
  switch (result.reason) {
    case 'empty':
      return `${what} is required`
    case 'invalid':
      return `${what} must be a number, e.g. 1250.50`
    case 'too_many_decimals':
      return `${what} can have at most 2 decimal places`
  }
}

/** 3333 -> "33.33", 500 -> "5" — exact, no float formatting. */
function formatBasisPoints(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100)
  const fraction = String(basisPoints % 100).padStart(2, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : String(whole)
}

export function validateDescription(description: string): string | undefined {
  const text = description.trim()
  if (text === '') return 'Description is required'
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`
  }
  return undefined
}

export function validateAmount(amount: string): string | undefined {
  const parsed = parseRupees(amount)
  if (!parsed.ok) return parseFailureMessage(parsed, 'Amount')
  if (parsed.value <= 0) return 'Amount must be more than ₹0'
  if (parsed.value > MAX_AMOUNT) return `Amount can't be more than ${formatINR(MAX_AMOUNT)}`
  return undefined
}

/** `today` is passed in (YYYY-MM-DD, local time) so this stays pure and testable. */
export function validateDate(date: string, today: string): string | undefined {
  if (date === '') return 'Date is required'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Enter a valid date'
  // ISO dates compare correctly as strings.
  if (date > today) return "Date can't be in the future"
  return undefined
}

export function validateEqualSplit(memberIds: readonly string[]): FormErrors {
  return memberIds.length === 0 ? { split: 'Select at least one member' } : {}
}

/** Members with a non-blank input, in the order given. */
function filledEntries(shares: Record<string, string>): [string, string][] {
  return Object.entries(shares).filter(([, value]) => value.trim() !== '')
}

/** `amount` is null when the amount itself is invalid, so the sum can't be checked yet. */
export function validateExactSplit(shares: Record<string, string>, amount: Paise | null): FormErrors {
  const errors: FormErrors = {}
  const entries = filledEntries(shares)
  if (entries.length === 0) return { split: 'Enter a share for at least one member' }

  let sum = 0
  for (const [memberId, value] of entries) {
    const parsed = parseRupees(value)
    if (!parsed.ok) errors[shareErrorKey(memberId)] = parseFailureMessage(parsed, 'Share')
    else if (parsed.value < 0) errors[shareErrorKey(memberId)] = "Share can't be negative"
    else sum += parsed.value
  }

  if (Object.keys(errors).length === 0 && amount !== null && sum !== amount) {
    const diff = amount - sum
    errors.split =
      diff > 0 ? `${formatINR(diff)} left to assign` : `${formatINR(-diff)} over the amount`
  }
  return errors
}

export function validatePercentSplit(shares: Record<string, string>): FormErrors {
  const errors: FormErrors = {}
  const entries = filledEntries(shares)
  if (entries.length === 0) return { split: 'Enter a percentage for at least one member' }

  // Sum integer basis points, never floats, so 33.33 + 33.33 + 33.34 is exactly 10000.
  let sum = 0
  for (const [memberId, value] of entries) {
    const parsed = parsePercentToBasisPoints(value)
    if (!parsed.ok) errors[shareErrorKey(memberId)] = parseFailureMessage(parsed, 'Percentage')
    else if (parsed.value < 0 || parsed.value > FULL_PERCENT_BASIS_POINTS) {
      errors[shareErrorKey(memberId)] = 'Percentage must be between 0 and 100'
    } else sum += parsed.value
  }

  if (Object.keys(errors).length === 0 && sum !== FULL_PERCENT_BASIS_POINTS) {
    const diff = FULL_PERCENT_BASIS_POINTS - sum
    errors.split =
      diff > 0
        ? `${formatBasisPoints(diff)}% left to assign`
        : `${formatBasisPoints(-diff)}% over 100%`
  }
  return errors
}

/** Every rule for the Add expense form. An empty result means the form is valid. */
export function validateExpenseForm(values: ExpenseFormValues, today: string): FormErrors {
  const errors: FormErrors = {}
  const set = (field: string, message: string | undefined) => {
    if (message) errors[field] = message
  }

  set('description', validateDescription(values.description))
  const amountError = validateAmount(values.amount)
  set('amount', amountError)
  set('paidBy', values.paidBy === '' ? 'Choose who paid' : undefined)
  set('date', validateDate(values.date, today))
  set('category', isCategory(values.category) ? undefined : 'Choose a category')

  const parsedAmount = parseRupees(values.amount)
  const amount = !amountError && parsedAmount.ok ? parsedAmount.value : null

  switch (values.splitType) {
    case 'equal':
      return { ...errors, ...validateEqualSplit(values.equalMemberIds) }
    case 'exact':
      return { ...errors, ...validateExactSplit(values.exactShares, amount) }
    case 'percent':
      return { ...errors, ...validatePercentSplit(values.percentShares) }
  }
}

/** Parses a value that validation has already accepted. */
function mustParse(result: ParseResult): number {
  if (!result.ok) throw new Error('buildExpense called with unvalidated input')
  return result.value
}

/**
 * Turns a form that passed `validateExpenseForm` into an Expense. Members left blank
 * in an exact or percent split are not included in the shares.
 */
export function buildExpense(values: ExpenseFormValues, id: string): Expense {
  if (!isCategory(values.category)) throw new Error('buildExpense called with unvalidated input')

  let split: Split
  switch (values.splitType) {
    case 'equal':
      split = { type: 'equal', memberIds: [...values.equalMemberIds] }
      break
    case 'exact':
      split = {
        type: 'exact',
        shares: Object.fromEntries(
          filledEntries(values.exactShares).map(([memberId, value]) => [
            memberId,
            mustParse(parseRupees(value)),
          ]),
        ),
      }
      break
    case 'percent':
      split = {
        type: 'percent',
        // PercentSplit stores percents; basis points / 100 keeps at most 2 decimals.
        shares: Object.fromEntries(
          filledEntries(values.percentShares).map(([memberId, value]) => [
            memberId,
            mustParse(parsePercentToBasisPoints(value)) / 100,
          ]),
        ),
      }
      break
  }

  return {
    id,
    description: values.description.trim(),
    amount: mustParse(parseRupees(values.amount)),
    paidBy: values.paidBy,
    date: values.date,
    category: values.category,
    split,
  }
}
