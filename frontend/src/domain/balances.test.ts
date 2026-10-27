import { describe, expect, it } from 'vitest'
import { balanceStatus, computeBalances } from './balances'
import type { Expense, Member } from './types'

const members: Member[] = [
  { id: 'a', name: 'Asha' },
  { id: 'b', name: 'Bala' },
  { id: 'c', name: 'Chitra' },
]

const base = { date: '2026-03-01', category: 'Food' } as const

describe('computeBalances', () => {
  it('credits the payer and debits each participant', () => {
    const expenses: Expense[] = [
      { ...base, id: '1', description: 'Dinner', amount: 9000, paidBy: 'a',
        split: { type: 'equal', memberIds: ['a', 'b', 'c'] } },
    ]
    expect(computeBalances(members, expenses)).toEqual({ a: 6000, b: -3000, c: -3000 })
  })

  it('lets the payer sit outside the split', () => {
    const expenses: Expense[] = [
      { ...base, id: '1', description: 'Groceries', amount: 1000, paidBy: 'a',
        split: { type: 'equal', memberIds: ['b', 'c'] } },
    ]
    expect(computeBalances(members, expenses)).toEqual({ a: 1000, b: -500, c: -500 })
  })

  it('sums to exactly zero for ₹100 split between 3', () => {
    const expenses: Expense[] = [
      { ...base, id: '1', description: 'Snacks', amount: 10000, paidBy: 'a',
        split: { type: 'equal', memberIds: ['a', 'b', 'c'] } },
    ]
    const balances = computeBalances(members, expenses)
    expect(balances).toEqual({ a: 6666, b: -3333, c: -3333 })
    expect(Object.values(balances).reduce((x, y) => x + y, 0)).toBe(0)
  })

  it('sums to zero across mixed split types', () => {
    const expenses: Expense[] = [
      { ...base, id: '1', description: 'Cab', amount: 149999, paidBy: 'a',
        split: { type: 'percent', shares: { a: 33.33, b: 33.33, c: 33.34 } } },
      { ...base, id: '2', description: 'Scuba', amount: 1050000, paidBy: 'b',
        split: { type: 'exact', shares: { b: 350000, c: 700000 } } },
      { ...base, id: '3', description: 'Villa', amount: 777777, paidBy: 'c',
        split: { type: 'equal', memberIds: ['a', 'b', 'c'] } },
    ]
    const total = Object.values(computeBalances(members, expenses)).reduce((x, y) => x + y, 0)
    expect(total).toBe(0)
  })

  it('returns zero for everyone when there are no expenses', () => {
    expect(computeBalances(members, [])).toEqual({ a: 0, b: 0, c: 0 })
  })
})

describe('balanceStatus', () => {
  it('classifies balances', () => {
    expect(balanceStatus(250)).toEqual({ kind: 'gets_back', amount: 250 })
    expect(balanceStatus(-250)).toEqual({ kind: 'owes', amount: 250 })
    expect(balanceStatus(0)).toEqual({ kind: 'settled' })
  })
})
