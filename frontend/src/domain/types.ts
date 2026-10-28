/** All money values in the domain are integers in paise (₹1 = 100 paise). */
export type Paise = number

export const CATEGORIES = ['Food', 'Travel', 'Stay', 'Activities', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

export interface Member {
  id: string
  name: string
}

export interface EqualSplit {
  type: 'equal'
  memberIds: string[]
}

export interface ExactSplit {
  type: 'exact'
  /** paise per member id */
  shares: Record<string, Paise>
}

export interface PercentSplit {
  type: 'percent'
  /** percent per member id, up to 2 decimals */
  shares: Record<string, number>
}

export type Split = EqualSplit | ExactSplit | PercentSplit
export type SplitType = Split['type']
export const SPLIT_TYPES: readonly SplitType[] = ['equal', 'exact', 'percent']

export interface Expense {
  id: string
  description: string
  amount: Paise
  paidBy: string
  /** YYYY-MM-DD */
  date: string
  category: Category
  split: Split
}

export interface TripData {
  members: Member[]
  expenses: Expense[]
}

export function isCategory(value: string): value is Category {
  return CATEGORIES.some((c) => c === value)
}
