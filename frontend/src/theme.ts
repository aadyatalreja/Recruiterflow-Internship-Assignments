/**
 * Light / dark theme. The theme is a data-theme attribute on <html>, which index.css reads.
 * A theme the user picked is saved in localStorage; until they pick one, the app follows the
 * device setting. index.html applies the saved theme before React loads, so the page never
 * flashes the wrong colours; keep its storage key in sync with THEME_STORAGE_KEY.
 */

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'trip-splitter:theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** The theme the user picked, or null if they never did (or storage is unavailable). */
export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage blocked (e.g. private mode): the theme still applies for this visit.
  }
}

/** The device's preference. matchMedia is missing in some test environments. */
export function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
    ? 'dark'
    : 'light'
}

export function initialTheme(): Theme {
  return readStoredTheme() ?? systemTheme()
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/** Calls onChange when the device setting flips. Returns a function that stops listening. */
export function onSystemThemeChange(onChange: (theme: Theme) => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DARK_QUERY)
  const listener = (event: MediaQueryListEvent) => onChange(event.matches ? 'dark' : 'light')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
