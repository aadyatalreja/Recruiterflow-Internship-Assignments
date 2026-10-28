import { afterEach, describe, expect, it } from 'vitest'
import type { Expense } from '../domain/types'
import { SAMPLE_TRIP_DATA } from './expensesSlice'
import { STORAGE_KEY, loadExpenses } from './persistence'

const saved: Expense[] = [
  {
    id: 'x1',
    description: 'Ferry',
    amount: 50000,
    paidBy: 'm2',
    date: '2026-03-16',
    category: 'Travel',
    split: { type: 'equal', memberIds: ['m1', 'm2'] },
  },
]

afterEach(() => {
  localStorage.clear()
})

describe('loadExpenses', () => {
  it('returns the saved expenses when they are valid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    expect(loadExpenses()).toEqual(saved)
  })

  it('keeps an empty saved list (everything deleted)', () => {
    localStorage.setItem(STORAGE_KEY, '[]')
    expect(loadExpenses()).toEqual([])
  })

  it('falls back to the sample data when nothing is saved', () => {
    expect(loadExpenses()).toBe(SAMPLE_TRIP_DATA.expenses)
  })

  it('falls back to the sample data when the JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadExpenses()).toBe(SAMPLE_TRIP_DATA.expenses)
  })

  it('falls back to the sample data when any saved expense has the wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved, { id: 'x2', amount: 'lots' }]))
    expect(loadExpenses()).toBe(SAMPLE_TRIP_DATA.expenses)

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses: saved }))
    expect(loadExpenses()).toBe(SAMPLE_TRIP_DATA.expenses)
  })
})
