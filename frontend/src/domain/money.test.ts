import { describe, expect, it } from 'vitest'
import { formatINR, parseRupees, parseScaled } from './money'

describe('parseRupees', () => {
  it('converts rupees to paise without float error', () => {
    expect(parseRupees('1250.50')).toEqual({ ok: true, value: 125050 })
    expect(parseRupees('19.99')).toEqual({ ok: true, value: 1999 })
    expect(parseRupees('0.1')).toEqual({ ok: true, value: 10 })
    expect(parseRupees('100')).toEqual({ ok: true, value: 10000 })
  })

  it('keeps the sign so validation can report negatives', () => {
    expect(parseRupees('-5')).toEqual({ ok: true, value: -500 })
    expect(parseRupees('-0')).toEqual({ ok: true, value: 0 })
  })

  it('rejects empty, non-numeric and over-precise input', () => {
    expect(parseRupees('')).toEqual({ ok: false, reason: 'empty' })
    expect(parseRupees('  ')).toEqual({ ok: false, reason: 'empty' })
    expect(parseRupees('abc')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseRupees('1e3')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseRupees('.5')).toEqual({ ok: false, reason: 'invalid' })
    expect(parseRupees('1.234')).toEqual({ ok: false, reason: 'too_many_decimals' })
  })

  it('accepts trailing zeros beyond two decimals', () => {
    expect(parseRupees('5.500')).toEqual({ ok: true, value: 550 })
  })
})

describe('parseScaled', () => {
  it('handles percentages as basis points', () => {
    expect(parseScaled('33.33', 2)).toEqual({ ok: true, value: 3333 })
    expect(parseScaled('100', 2)).toEqual({ ok: true, value: 10000 })
  })
})

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(10000000)).toBe('₹1,00,000.00')
    expect(formatINR(123456789)).toBe('₹12,34,567.89')
    expect(formatINR(99900)).toBe('₹999.00')
    expect(formatINR(100000)).toBe('₹1,000.00')
  })

  it('formats zero, small and negative amounts', () => {
    expect(formatINR(0)).toBe('₹0.00')
    expect(formatINR(5)).toBe('₹0.05')
    expect(formatINR(-125050)).toBe('-₹1,250.50')
  })
})
