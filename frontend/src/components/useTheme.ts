import { useEffect, useState } from 'react'
import {
  applyTheme,
  initialTheme,
  onSystemThemeChange,
  readStoredTheme,
  storeTheme,
  type Theme,
} from '../theme'

/**
 * The current theme and a way to flip it. UI-only state, so it lives in React rather than
 * Redux. App owns it because both the navbar toggle and the animated background need it.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Until the user picks a theme, keep following the device setting if it changes.
  useEffect(
    () =>
      onSystemThemeChange((system) => {
        if (readStoredTheme() === null) setTheme(system)
      }),
    [],
  )

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    storeTheme(next)
    setTheme(next)
  }

  return { theme, toggleTheme }
}
