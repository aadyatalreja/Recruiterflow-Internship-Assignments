import type { Paise } from './types'

export type ParseFailure = 'empty' | 'invalid' | 'too_many_decimals'
export type ParseResult = { ok: true; value: number } | { ok: false; reason: ParseFailure }

const NUMBER_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/

/**
 * Parses a plain decimal string into an integer scaled by 10^decimals, using
 * string maths so no floating-point error can creep in
 * ("19.99" -> 1999 for decimals = 2).
 * Extra decimal digits are accepted only if they are all zeros ("5.500").
 */
export function parseScaled(input: string, decimals: number): ParseResult {
  const text = input.trim()
  if (text === '') return { ok: false, reason: 'empty' }

  const match = NUMBER_PATTERN.exec(text)
  const sign = match?.[1]
  const whole = match?.[2]
  if (sign === undefined || whole === undefined) return { ok: false, reason: 'invalid' }

  const fraction = match?.[3] ?? ''
  const kept = fraction.slice(0, decimals)
  const extra = fraction.slice(decimals)
  if (/[1-9]/.test(extra)) return { ok: false, reason: 'too_many_decimals' }

  const scaled = Number(whole) * 10 ** decimals + Number(kept.padEnd(decimals, '0') || '0')
  if (!Number.isSafeInteger(scaled)) return { ok: false, reason: 'invalid' }

  return { ok: true, value: sign === '-' && scaled !== 0 ? -scaled : scaled }
}

/** "1250.50" -> 125050 paise */
export function parseRupees(input: string): ParseResult {
  return parseScaled(input, 2)
}

/** "33.33" -> 3333 (hundredths of a percent). */
export function parsePercentToBasisPoints(input: string): ParseResult {
  return parseScaled(input, 2)
}

/** Groups digits the Indian way: 1234567 -> "12,34,567". */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits
  const lastThree = digits.slice(-3)
  const rest = digits.slice(0, -3)
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
}

/** 10000000 -> "₹1,00,000.00" (negative amounts get a leading minus). */
export function formatINR(paise: Paise): string {
  const abs = Math.abs(paise)
  const rupees = Math.floor(abs / 100)
  const rest = abs % 100
  const sign = paise < 0 ? '-' : ''
  return `${sign}₹${groupIndian(String(rupees))}.${String(rest).padStart(2, '0')}`
}

/** 125050 -> "1250.50" — used to pre-fill or echo inputs. */
export function paiseToInputString(paise: Paise): string {
  const abs = Math.abs(paise)
  const sign = paise < 0 ? '-' : ''
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
