import { balanceStatus, type BalanceBreakdown as Breakdown } from '../domain/balances'
import { formatDate } from '../domain/dates'
import { formatINR } from '../domain/money'
import type { Paise } from '../domain/types'

/** "+₹1,000.00", "−₹500.00" or "₹0.00", with a real minus sign. */
function signedINR(paise: Paise): string {
  if (paise > 0) return `+${formatINR(paise)}`
  if (paise < 0) return `−${formatINR(-paise)}`
  return formatINR(0)
}

function tone(paise: Paise): string {
  return paise > 0 ? 'positive' : paise < 0 ? 'negative' : 'zero'
}

/** "gets back ₹X" / "owes ₹X" / "is settled up", for the closing sum. */
function outcome(balance: Paise): string {
  const status = balanceStatus(balance)
  switch (status.kind) {
    case 'gets_back':
      return `gets back ${formatINR(status.amount)}`
    case 'owes':
      return `owes ${formatINR(status.amount)}`
    case 'settled':
      return 'is settled up'
  }
}

/**
 * How one member's balance is made up: every expense they paid for or share in, what they paid,
 * their share, and the effect on their balance. The sum at the bottom matches their balance card.
 */
export default function BalanceBreakdown({
  id,
  name,
  breakdown,
  onClose,
}: {
  id: string
  name: string
  breakdown: Breakdown
  onClose: () => void
}) {
  const { lines, totalPaid, totalShare, balance } = breakdown
  const headingId = `${id}-heading`

  return (
    <section id={id} className="card breakdown" aria-labelledby={headingId}>
      <div className="breakdown-header">
        <h3 id={headingId}>How {name}’s balance adds up</h3>
        <button type="button" className="breakdown-close" onClick={onClose}>
          Close
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="breakdown-empty">{name} hasn’t paid for or shared in any expense yet.</p>
      ) : (
        <table className="breakdown-table">
          <caption className="visually-hidden">Expenses affecting {name}’s balance, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Expense</th>
              <th scope="col" className="num">
                Paid
              </th>
              <th scope="col" className="num">
                Their share
              </th>
              <th scope="col" className="num">
                Effect
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ expense, paid, share }) => (
              <tr key={expense.id}>
                <th scope="row">
                  <span className="breakdown-expense">{expense.description}</span>
                  <span className="breakdown-date">{formatDate(expense.date)}</span>
                </th>
                <td data-label="Paid" className="num">
                  {paid > 0 ? formatINR(paid) : '—'}
                </td>
                <td data-label="Their share" className="num">
                  {share > 0 ? formatINR(share) : '—'}
                </td>
                <td data-label="Effect" className={`num breakdown-${tone(paid - share)}`}>
                  {signedINR(paid - share)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="breakdown-sum">
        Paid <strong>{formatINR(totalPaid)}</strong> − share <strong>{formatINR(totalShare)}</strong> ={' '}
        <strong className={`breakdown-${tone(balance)}`}>
          {name} {outcome(balance)}
        </strong>
      </p>
    </section>
  )
}
