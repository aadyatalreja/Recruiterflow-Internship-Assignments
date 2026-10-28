import { describe, expect, it } from 'vitest'
import sampleData from '../data/sample-data.json'
import { isExpense } from './storedData'

const valid = {
  id: 'e1',
  description: 'Dinner',
  amount: 10000,
  paidBy: 'm1',
  date: '2026-03-12',
  category: 'Food',
  split: { type: 'equal', memberIds: ['m1', 'm2'] },
}

describe('isExpense', () => {
  it('accepts every expense in the sample data', () => {
    expect(sampleData.expenses.every(isExpense)).toBe(true)
  })

  it('accepts all three split shapes when they add up', () => {
    expect(isExpense(valid)).toBe(true)
    expect(isExpense({ ...valid, split: { type: 'exact', shares: { m1: 6000, m2: 4000 } } })).toBe(
      true,
    )
    expect(
      isExpense({ ...valid, split: { type: 'percent', shares: { m1: 33.33, m2: 33.33, m3: 33.34 } } }),
    ).toBe(true)
  })

  it('rejects non-objects and missing or mistyped fields', () => {
    expect(isExpense(null)).toBe(false)
    expect(isExpense([valid])).toBe(false)
    expect(isExpense({ ...valid, id: undefined })).toBe(false)
    expect(isExpense({ ...valid, amount: '100' })).toBe(false)
    expect(isExpense({ ...valid, amount: 100.5 })).toBe(false)
    expect(isExpense({ ...valid, amount: 0 })).toBe(false)
    expect(isExpense({ ...valid, date: '12/03/2026' })).toBe(false)
    expect(isExpense({ ...valid, category: 'Shopping' })).toBe(false)
  })

  it('rejects splits that break the money rules', () => {
    expect(isExpense({ ...valid, split: { type: 'equal', memberIds: [] } })).toBe(false)
    expect(isExpense({ ...valid, split: { type: 'exact', shares: { m1: 6000, m2: 3000 } } })).toBe(
      false,
    )
    expect(isExpense({ ...valid, split: { type: 'exact', shares: { m1: -100, m2: 10100 } } })).toBe(
      false,
    )
    expect(isExpense({ ...valid, split: { type: 'percent', shares: { m1: 60, m2: 30 } } })).toBe(
      false,
    )
    expect(isExpense({ ...valid, split: { type: 'percent', shares: { m1: 33.333, m2: 66.667 } } })).toBe(
      false,
    )
    expect(isExpense({ ...valid, split: { type: 'shares', shares: {} } })).toBe(false)
  })
})
