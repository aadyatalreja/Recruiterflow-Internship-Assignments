import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
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
