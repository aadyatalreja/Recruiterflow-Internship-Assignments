import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_STORAGE_KEY,
  applyTheme,
  initialTheme,
  isTheme,
  readStoredTheme,
  storeTheme,
} from './theme'

/** Pretends the device prefers dark (or light) through matchMedia. */
function deviceDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('theme', () => {
  it('recognises only light and dark', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('blue')).toBe(false)
    expect(isTheme(null)).toBe(false)
  })

  it('follows the device setting until the user picks a theme', () => {
    deviceDark(true)
    expect(initialTheme()).toBe('dark')
    deviceDark(false)
    expect(initialTheme()).toBe('light')
  })

  it('prefers the saved choice over the device setting', () => {
    deviceDark(true)
    storeTheme('light')
    expect(readStoredTheme()).toBe('light')
    expect(initialTheme()).toBe('light')
  })

  it('ignores a corrupted saved value', () => {
    deviceDark(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(readStoredTheme()).toBeNull()
    expect(initialTheme()).toBe('light')
  })

  it('applies the theme as data-theme on <html>', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
