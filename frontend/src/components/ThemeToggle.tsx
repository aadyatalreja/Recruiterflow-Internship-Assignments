import { useEffect, useState } from 'react'
import {
  applyTheme,
  initialTheme,
  onSystemThemeChange,
  readStoredTheme,
  storeTheme,
  type Theme,
} from '../theme'
import { MoonIcon, SunIcon } from './Icons'

/** Switches between light and dark. The theme is UI-only, so it lives here rather than in Redux. */
export default function ThemeToggle() {
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

  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  function toggle() {
    storeTheme(next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {next === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}
