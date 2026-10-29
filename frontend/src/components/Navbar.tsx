import { NavLink } from 'react-router-dom'
import { BrandMark } from './Icons'
import ThemeToggle from './ThemeToggle'
import type { Theme } from '../theme'

export default function Navbar({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">
          <BrandMark />
          Trip Splitter
        </span>
        <div className="navbar-actions">
          <nav aria-label="Main">
            <ul className="navbar-links">
              <li>
                {/* `end` stops "/" from matching every route and staying active everywhere. */}
                <NavLink to="/" end>
                  Expenses
                </NavLink>
              </li>
              <li>
                <NavLink to="/expenses/new">Add expense</NavLink>
              </li>
            </ul>
          </nav>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}
