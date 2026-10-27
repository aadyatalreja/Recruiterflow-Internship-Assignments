import type { Expense, Paise, Split } from './types'

/**
 * Remainder rule (used everywhere):
 *  - Equal split: every member gets floor(amount / n). The leftover paise are
 *    handed out one each to members in the order they appear in `memberIds`,
 *    so ₹100 between 3 is ₹33.34 + ₹33.33 + ₹33.33.
 *  - Percent split: largest-remainder method. Each member gets the floor of
 *    their exact share; leftover paise go one each to the members with the
 *    largest fractional parts, ties broken by order in `shares`.
 *
 * Both guarantee the shares add up to the expense amount exactly.
 * Precondition: the split has already passed validation.
 */

export function splitEqually(amount: Paise, memberIds: readonly string[]): Record<string, Paise> {
  const count = memberIds.length
  if (count === 0) return {}

  const base = Math.floor(amount / count)
  const extra = amount - base * count

  const result: Record<string, Paise> = {}
  memberIds.forEach((id, index) => {
    result[id] = base + (index < extra ? 1 : 0)
  })
  return result
}

export function splitByPercent(
  amount: Paise,
  percents: Readonly<Record<string, number>>,
): Record<string, Paise> {
  const entries = Object.entries(percents).map(([id, percent], order) => {
    const basisPoints = Math.round(percent * 100)
    const numerator = amount * basisPoints
    const remainder = numerator % 10000
    return { id, order, floor: (numerator - remainder) / 10000, remainder }
  })

  const assigned = entries.reduce((sum, entry) => sum + entry.floor, 0)
  let leftover = amount - assigned

  const byLargestRemainder = [...entries].sort(
    (a, b) => b.remainder - a.remainder || a.order - b.order,
  )
  const bonus = new Map<string, number>()
  for (const entry of byLargestRemainder) {
    if (leftover <= 0) break
    bonus.set(entry.id, 1)
    leftover -= 1
  }

  const result: Record<string, Paise> = {}
  for (const entry of entries) {
    result[entry.id] = entry.floor + (bonus.get(entry.id) ?? 0)
  }
  return result
}

/** Paise owed by each participating member for one expense. */
export function computeShares(amount: Paise, split: Split): Record<string, Paise> {
  switch (split.type) {
    case 'equal':
      return splitEqually(amount, split.memberIds)
    case 'exact':
      return { ...split.shares }
    case 'percent':
      return splitByPercent(amount, split.shares)
  }
}

export function sharesOf(expense: Expense): Record<string, Paise> {
  return computeShares(expense.amount, expense.split)
}

/** "Equally, 4 people" / "Exact amounts, 3 people" / "Percentages, 3 people" */
export function describeSplit(split: Split): string {
  const people = split.type === 'equal' ? split.memberIds.length : Object.keys(split.shares).length
  const noun = people === 1 ? 'person' : 'people'
  const label = { equal: 'Equally', exact: 'Exact amounts', percent: 'Percentages' }[split.type]
  return `${label}, ${people} ${noun}`
}
