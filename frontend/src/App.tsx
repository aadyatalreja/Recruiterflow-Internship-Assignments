import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LineWaves from './components/LineWaves/LineWaves'
import Navbar from './components/Navbar'
import { useTheme } from './components/useTheme'
import AddExpensePage from './pages/AddExpensePage'
import ExpensesPage from './pages/ExpensesPage'
import NotFoundPage from './pages/NotFoundPage'

// Purple-to-pink line colours. In light mode LineWaves draws them as deeper ink of the same
// hues, so one palette works on both themes.
const LINE_COLORS = ['#a855f7', '#ec4899', '#7c3aed'] as const

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <BrowserRouter>
      {/* Decorative animated background, fixed behind everything. */}
      <div className="app-background" aria-hidden="true">
        <LineWaves
          color1={LINE_COLORS[0]}
          color2={LINE_COLORS[1]}
          color3={LINE_COLORS[2]}
          lightMode={!dark}
          speed={0.38}
          lineCount={85}
          lineWidth={1.35}
          highlight={1}
          warpIntensity={1.25}
          rotation={-33}
          colorCycleSpeed={2.4}
          glow={0.65}
          brightness={dark ? 1.1 : 1.3}
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
