import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LiquidEther from './components/LiquidEther/LiquidEther'
import Navbar from './components/Navbar'
import { useTheme } from './components/useTheme'
import AddExpensePage from './pages/AddExpensePage'
import ExpensesPage from './pages/ExpensesPage'
import NotFoundPage from './pages/NotFoundPage'

// Liquid colours, from calm to fast flow. Dark mode glows; light mode draws soft ink in the
// app's indigo/violet family, so it reads as colour on a pale page rather than a dark smudge.
const DARK_COLORS = ['#5227FF', '#FF9FFC', '#B497CF']
const LIGHT_COLORS = ['#6366f1', '#a855f7', '#ec4899']

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <BrowserRouter>
      {/* Decorative animated background, fixed behind everything. */}
      <div className="app-background" aria-hidden="true">
        <LiquidEther
          colors={dark ? DARK_COLORS : LIGHT_COLORS}
          lightMode={!dark}
          // Ink on white needs a little more strength to show through the frosted panels.
          intensity={dark ? 1 : 1.4}
          mouseForce={20}
          cursorSize={100}
          persistence={0.75}
          autoDemo
          autoSpeed={0.5}
          autoIntensity={2.2}
        />
      </div>

      <div className="app-content">
        {/* First focusable element, so keyboard users can jump past the navbar. */}
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navbar theme={theme} onToggleTheme={toggleTheme} />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<ExpensesPage />} />
            <Route path="/expenses/new" element={<AddExpensePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
