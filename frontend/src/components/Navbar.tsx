import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="navbar">
      <span className="navbar-brand">Trip Splitter</span>
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
    </header>
  )
}
