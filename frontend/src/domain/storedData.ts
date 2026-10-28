import { isCategory, type Expense } from './types'

/**
 * Runtime checks for data read back from localStorage, which may be stale, hand-edited
 * or from an older version of the app. They check the shape and the money invariants
 * the rest of the app relies on: exact shares add up to the amount and percentages
 * add up to 100, so balances still sum to exactly ₹0.
 */

const FULL_PERCENT_BASIS_POINTS = 10000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function isPaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** A percentage in 0–100 with at most 2 decimals, as basis points (33.33 -> 3333), or null. */
function percentToBasisPoints(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) return null
  const basisPoints = Math.round(value * 100)
  // Rejects values like 33.333 that have more than 2 decimals.
  return Math.abs(value * 100 - basisPoints) < 1e-6 ? basisPoints : null
}

function isValidSplit(split: unknown, amount: number): boolean {
  if (!isRecord(split)) return false

  switch (split.type) {
    case 'equal':
      return (
        Array.isArray(split.memberIds) &&
        split.memberIds.length > 0 &&
        split.memberIds.every(isNonEmptyString)
      )
    case 'exact': {
      if (!isRecord(split.shares)) return false
      const shares = Object.values(split.shares)
      return shares.length > 0 && shares.every(isPaise) && shares.reduce((a, b) => a + b, 0) === amount
    }
    case 'percent': {
      if (!isRecord(split.shares)) return false
      const basisPoints = Object.values(split.shares).map(percentToBasisPoints)
      if (basisPoints.length === 0) return false
      let sum = 0
      for (const bp of basisPoints) {
        if (bp === null) return false
        sum += bp
      }
      return sum === FULL_PERCENT_BASIS_POINTS
    }
    default:
      return false
  }
}

export function isExpense(value: unknown): value is Expense {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.description) &&
    isPaise(value.amount) &&
    value.amount > 0 &&
    isNonEmptyString(value.paidBy) &&
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    typeof value.category === 'string' &&
    isCategory(value.category) &&
    isValidSplit(value.split, value.amount)
  )
}
