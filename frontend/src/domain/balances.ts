import { sharesOf } from './split'
import type { Expense, Member, Paise } from './types'

/**
 * Balance = what the member paid − their share of every expense they are part of.
 * Positive means they get money back. The payer need not be in the split.
 * Because each expense's shares add up to its amount, balances sum to exactly 0.
 */
export function computeBalances(
  members: readonly Member[],
  expenses: readonly Expense[],
): Record<string, Paise> {
  const balances: Record<string, Paise> = {}
  for (const member of members) {
    balances[member.id] = 0
  }

  for (const expense of expenses) {
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount
    for (const [memberId, share] of Object.entries(sharesOf(expense))) {
      balances[memberId] = (balances[memberId] ?? 0) - share
    }
  }
  return balances
}

export type BalanceStatus =
  | { kind: 'gets_back'; amount: Paise }
  | { kind: 'owes'; amount: Paise }
  | { kind: 'settled' }

export function balanceStatus(balance: Paise): BalanceStatus {
  if (balance > 0) return { kind: 'gets_back', amount: balance }
  if (balance < 0) return { kind: 'owes', amount: -balance }
  return { kind: 'settled' }
}
