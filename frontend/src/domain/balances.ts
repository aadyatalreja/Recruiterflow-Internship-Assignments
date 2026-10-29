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

/** One expense's effect on a member's balance. */
export interface BalanceLine {
  expense: Expense
  /** The full amount if this member paid for it, otherwise 0. */
  paid: Paise
  /** This member's share of it, or 0 if they weren't part of the split. */
  share: Paise
}

export interface BalanceBreakdown {
  /** Only the expenses this member paid for or shares in, in the order given. */
  lines: BalanceLine[]
  totalPaid: Paise
  totalShare: Paise
  /** totalPaid − totalShare: always the same number computeBalances gives this member. */
  balance: Paise
}

/** How one member's balance is made up, expense by expense. */
export function balanceBreakdown(memberId: string, expenses: readonly Expense[]): BalanceBreakdown {
  const lines: BalanceLine[] = []
  let totalPaid = 0
  let totalShare = 0

  for (const expense of expenses) {
    const paid = expense.paidBy === memberId ? expense.amount : 0
    const share = sharesOf(expense)[memberId] ?? 0
    if (paid === 0 && share === 0) continue
    lines.push({ expense, paid, share })
    totalPaid += paid
    totalShare += share
  }
  return { lines, totalPaid, totalShare, balance: totalPaid - totalShare }
}
