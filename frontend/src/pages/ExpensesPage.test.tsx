import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TripData } from '../domain/types'
import expensesReducer from '../store/expensesSlice'
import ExpensesPage from './ExpensesPage'

const trip: TripData = {
  members: [
    { id: 'm1', name: 'Asha' },
    { id: 'm2', name: 'Bala' },
  ],
  expenses: [
    {
      id: 'e1',
      description: 'Taxi',
      amount: 10000,
      paidBy: 'm1',
      date: '2026-03-12',
      category: 'Travel',
      split: { type: 'equal', memberIds: ['m1', 'm2'] },
    },
  ],
}

function renderPage() {
  const store = configureStore({
    reducer: { expenses: expensesReducer },
    preloadedState: { expenses: structuredClone(trip) },
  })
  const user = userEvent.setup()
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ExpensesPage />
      </MemoryRouter>
    </Provider>,
  )
  return { store, user }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ExpensesPage delete', () => {
  it('keeps the expense when the user cancels the confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { store, user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Taxi' }))

    expect(confirm).toHaveBeenCalledWith('Delete “Taxi” (₹100.00)? This can\'t be undone.')
    expect(store.getState().expenses.expenses).toHaveLength(1)
    expect(screen.getByText('owes ₹50.00')).toBeInTheDocument()
  })

  it('deletes after confirming and settles the balances straight away', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { store, user } = renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Taxi' }))

    expect(store.getState().expenses.expenses).toHaveLength(0)
    expect(screen.getAllByText('settled up')).toHaveLength(2)
    expect(screen.getByText('Deleted “Taxi”.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No expenses yet' })).toBeInTheDocument()
  })
})

describe('ExpensesPage balance breakdown', () => {
  it('opens a member’s breakdown from their name and closes it again', async () => {
    const { user } = renderPage()
    const asha = screen.getByRole('button', { name: /^Asha/ })
    expect(asha).toHaveAttribute('aria-expanded', 'false')

    await user.click(asha)

    expect(asha).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('region', { name: 'How Asha’s balance adds up' })
    const row = within(panel).getByRole('row', { name: /Taxi/ })
    expect(within(row).getByText('₹100.00')).toBeInTheDocument()
    expect(within(row).getByText('₹50.00')).toBeInTheDocument()
    expect(within(row).getByText('+₹50.00')).toBeInTheDocument()
    expect(panel).toHaveTextContent('Paid ₹100.00 − share ₹50.00 = Asha gets back ₹50.00')

    await user.click(within(panel).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('region', { name: /balance adds up/ })).not.toBeInTheDocument()
    expect(asha).toHaveAttribute('aria-expanded', 'false')
    expect(asha).toHaveFocus()
  })

  it('shows a member who only owes, and closes on Escape', async () => {
    const { user } = renderPage()

    await user.click(screen.getByRole('button', { name: /^Bala/ }))
    const panel = screen.getByRole('region', { name: 'How Bala’s balance adds up' })
    expect(panel).toHaveTextContent('Paid ₹0.00 − share ₹50.00 = Bala owes ₹50.00')
    expect(within(panel).getByText('−₹50.00')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: /balance adds up/ })).not.toBeInTheDocument()
  })
})
