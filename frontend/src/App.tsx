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
          // Colour strength follows flow speed, so the gentle ambient flow needs a brightness
          // boost to be visible; ink on white needs a little more than glow on dark.
          intensity={dark ? 1.5 : 1.8}
          // The liquid always flows on its own; moving the cursor stirs it harder on top.
          // The page window hides the middle of the screen, so the automatic stirrer roams out
          // to the edges (autoRange 0.5) and the swirls linger longer (persistence 0.9) to stay
          // visible around the window. Automatic stirring scales with mouseForce too, so
          // autoIntensity is set relative to it: ambient strength = mouseForce / 20 x 2.4.
          alwaysFlow
          autoDemo
          autoSpeed={0.6}
          autoRange={0.5}
          autoIntensity={2.4}
          mouseForce={40}
          cursorSize={140}
          persistence={0.9}
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
