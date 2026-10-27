import { describe, expect, it } from 'vitest'
import { computeShares, describeSplit, splitByPercent, splitEqually } from './split'

const sum = (shares: Record<string, number>) => Object.values(shares).reduce((a, b) => a + b, 0)

describe('splitEqually', () => {
  it('splits ₹100 between 3 as 33.34 + 33.33 + 33.33', () => {
    expect(splitEqually(10000, ['a', 'b', 'c'])).toEqual({ a: 3334, b: 3333, c: 3333 })
  })

  it('gives the extra paisa to the first members in listed order', () => {
    expect(splitEqually(10001, ['x', 'y', 'z'])).toEqual({ x: 3334, y: 3334, z: 3333 })
    expect(splitEqually(10000, ['z', 'a', 'm'])).toEqual({ z: 3334, a: 3333, m: 3333 })
  })

  it('divides evenly when possible', () => {
    expect(splitEqually(2400000, ['a', 'b', 'c', 'd', 'e'])).toEqual({
      a: 480000, b: 480000, c: 480000, d: 480000, e: 480000,
    })
  })

  it('never loses or invents a paisa', () => {
    for (let amount = 1; amount <= 500; amount += 7) {
      for (let n = 1; n <= 9; n++) {
        const ids = Array.from({ length: n }, (_, i) => `m${i}`)
        expect(sum(splitEqually(amount, ids))).toBe(amount)
      }
    }
  })

  it('handles a single member and no members', () => {
    expect(splitEqually(999, ['a'])).toEqual({ a: 999 })
    expect(splitEqually(999, [])).toEqual({})
  })
})

describe('splitByPercent', () => {
  it('splits cleanly when percentages divide evenly', () => {
    expect(splitByPercent(200000, { m5: 50, m1: 25, m2: 25 })).toEqual({
      m5: 100000, m1: 50000, m2: 50000,
    })
  })

  it('uses largest remainder so the airport cab sums exactly', () => {
    const shares = splitByPercent(149999, { m1: 33.33, m2: 33.33, m3: 33.34 })
    expect(shares).toEqual({ m1: 49995, m2: 49995, m3: 50009 })
    expect(sum(shares)).toBe(149999)
  })

  it('breaks remainder ties by listed order', () => {
    expect(splitByPercent(100, { a: 33.33, b: 33.33, c: 33.34 })).toEqual({ a: 33, b: 33, c: 34 })
    expect(splitByPercent(1, { a: 50, b: 50 })).toEqual({ a: 1, b: 0 })
  })

  it('never loses or invents a paisa', () => {
    for (let amount = 1; amount <= 400; amount += 13) {
      const shares = splitByPercent(amount, { a: 12.5, b: 37.25, c: 25.75, d: 24.5 })
      expect(sum(shares)).toBe(amount)
    }
  })
})

describe('computeShares', () => {
  it('returns exact shares as given', () => {
    expect(computeShares(1000, { type: 'exact', shares: { a: 400, b: 600 } })).toEqual({ a: 400, b: 600 })
  })
})

describe('describeSplit', () => {
  it('summarises each split type', () => {
    expect(describeSplit({ type: 'equal', memberIds: ['a', 'b', 'c', 'd'] })).toBe('Equally, 4 people')
    expect(describeSplit({ type: 'exact', shares: { a: 1, b: 2, c: 3 } })).toBe('Exact amounts, 3 people')
    expect(describeSplit({ type: 'percent', shares: { a: 100 } })).toBe('Percentages, 1 person')
  })
})
