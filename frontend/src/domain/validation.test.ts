import { describe, expect, it } from 'vitest'
import {
  buildExpense,
  previewShares,
  validateAmount,
  validateDate,
  validateDescription,
  validateExactSplit,
  validateExpenseForm,
  validatePercentSplit,
  type ExpenseFormValues,
} from './validation'

const TODAY = '2026-03-15'

const valid: ExpenseFormValues = {
  description: 'Dinner',
  amount: '100',
  paidBy: 'm1',
  date: '2026-03-14',
  category: 'Food',
  splitType: 'equal',
  equalMemberIds: ['m1', 'm2'],
  exactShares: {},
  percentShares: {},
}

describe('validateDescription', () => {
  it('requires text and caps it at 60 characters', () => {
    expect(validateDescription('  ')).toBe('Description is required')
    expect(validateDescription('a'.repeat(60))).toBeUndefined()
    expect(validateDescription('a'.repeat(61))).toMatch(/60 characters/)
  })
})

describe('validateAmount', () => {
  it('rejects empty, zero, negative and over-limit amounts', () => {
    expect(validateAmount('')).toBe('Amount is required')
    expect(validateAmount('0')).toBe('Amount must be more than ₹0')
    expect(validateAmount('-5')).toBe('Amount must be more than ₹0')
    expect(validateAmount('1000000')).toBeUndefined()
    expect(validateAmount('500000')).toBeUndefined()
    expect(validateAmount('1000000.01')).toBe("Amount can't be more than ₹10,00,000.00")
    expect(validateAmount('1.234')).toMatch(/2 decimal places/)
  })
})

describe('validateDate', () => {
  it('requires a date that is not in the future', () => {
    expect(validateDate('', TODAY)).toBe('Date is required')
    expect(validateDate(TODAY, TODAY)).toBeUndefined()
    expect(validateDate('2026-03-16', TODAY)).toBe("Date can't be in the future")
  })
})

describe('validateExactSplit', () => {
  it('accepts shares that sum exactly to the amount', () => {
    expect(validateExactSplit({ m1: '60', m2: '40.00' }, 10000)).toEqual({})
  })

  it('reports the shortfall or overage with formatINR', () => {
    expect(validateExactSplit({ m1: '60', m2: '30' }, 10000)).toEqual({
      split: '₹10.00 left to assign',
    })
    expect(validateExactSplit({ m1: '60', m2: '50.50' }, 10000)).toEqual({
      split: '₹10.50 over the amount',
    })
  })

  it('flags bad individual shares next to the member', () => {
    expect(validateExactSplit({ m1: '-1', m2: 'x' }, 10000)).toEqual({
      'share.m1': "Share can't be negative",
      'share.m2': 'Share must be a number, e.g. 1250.50',
    })
  })
})

describe('validatePercentSplit', () => {
  it('sums basis points exactly', () => {
    expect(validatePercentSplit({ m1: '33.33', m2: '33.33', m3: '33.34' })).toEqual({})
  })

  it('reports what is left or over', () => {
    expect(validatePercentSplit({ m1: '33.33', m2: '33.33' })).toEqual({
      split: '33.34% left to assign',
    })
    expect(validatePercentSplit({ m1: '60', m2: '40.5' })).toEqual({ split: '0.5% over 100%' })
  })

  it('keeps each percentage between 0 and 100', () => {
    expect(validatePercentSplit({ m1: '101' })).toEqual({
      'share.m1': 'Percentage must be between 0 and 100',
    })
  })
})

describe('validateExpenseForm', () => {
  it('passes a complete form', () => {
    expect(validateExpenseForm(valid, TODAY)).toEqual({})
  })

  it('requires paidBy, category and at least one equal member', () => {
    expect(
      validateExpenseForm({ ...valid, paidBy: '', category: '', equalMemberIds: [] }, TODAY),
    ).toEqual({
      paidBy: 'Choose who paid',
      category: 'Choose a category',
      split: 'Select at least one member',
    })
  })
})

describe('buildExpense', () => {
  it('stores exact shares in paise and skips blank members', () => {
    const expense = buildExpense(
      { ...valid, splitType: 'exact', exactShares: { m1: '60', m2: '40', m3: '' } },
      'id1',
    )
    expect(expense.amount).toBe(10000)
    expect(expense.split).toEqual({ type: 'exact', shares: { m1: 6000, m2: 4000 } })
  })

  it('stores percent shares as basis points / 100', () => {
    const expense = buildExpense(
      { ...valid, splitType: 'percent', percentShares: { m1: '33.33', m2: '66.67' } },
      'id1',
    )
    expect(expense.split).toEqual({ type: 'percent', shares: { m1: 33.33, m2: 66.67 } })
  })
})

describe('previewShares', () => {
  it('splits equally, giving leftover paise to the first members', () => {
    expect(previewShares({ ...valid, equalMemberIds: ['m1', 'm2', 'm3'] })).toEqual({
      m1: 3334,
      m2: 3333,
      m3: 3333,
    })
  })

  it('ignores fields that do not affect the shares', () => {
    expect(previewShares({ ...valid, description: '', paidBy: '', category: '' })).toEqual({
      m1: 5000,
      m2: 5000,
    })
  })

  it('returns null until the amount is valid', () => {
    expect(previewShares({ ...valid, amount: '' })).toBeNull()
    expect(previewShares({ ...valid, amount: '-5' })).toBeNull()
  })

  it('returns null until an exact split adds up to the amount', () => {
    const exact = { ...valid, splitType: 'exact' as const }
    expect(previewShares({ ...exact, exactShares: { m1: '60' } })).toBeNull()
    expect(previewShares({ ...exact, exactShares: { m1: '60', m2: '40' } })).toEqual({
      m1: 6000,
      m2: 4000,
    })
  })

  it('converts percentages to paise once they add up to 100', () => {
    const percent = { ...valid, splitType: 'percent' as const }
    expect(previewShares({ ...percent, percentShares: { m1: '50' } })).toBeNull()
    expect(previewShares({ ...percent, percentShares: { m1: '25', m2: '75' } })).toEqual({
      m1: 2500,
      m2: 7500,
    })
  })
})
