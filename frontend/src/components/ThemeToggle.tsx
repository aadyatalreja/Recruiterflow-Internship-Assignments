import type { Theme } from '../theme'
import { MoonIcon, SunIcon } from './Icons'

/** Switches between light and dark; the icon and label describe the theme it switches to. */
export default function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {next === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}
