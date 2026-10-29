import Neon404 from '../components/Neon404/Neon404'
import SpecularButton from '../components/SpecularButton/SpecularButton'

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="card not-found">
        <Neon404 />
        <h1>This page doesn’t exist</h1>
        <p>The link may be broken, or the page may have moved.</p>
        <SpecularButton
          to="/"
          size="md"
          radius={14}
          // Same violet look as the Expenses page's Add expense button.
          className="add-expense-cta"
          textColor="#ffffff"
          lineColor="var(--cta-line)"
          baseColor="var(--brand-to)"
          idleIntensity={0.5}
          proximity={220}
        >
          Back to Expenses
        </SpecularButton>
      </div>
    </div>
  )
}
