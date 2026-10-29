import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { TripData } from '../domain/types'
import expensesReducer from '../store/expensesSlice'
import AddExpensePage from './AddExpensePage'
import ExpensesPage from './ExpensesPage'

const trip: TripData = {
  members: [
    { id: 'm1', name: 'Asha' },
    { id: 'm2', name: 'Bala' },
    { id: 'm3', name: 'Chitra' },
  ],
  expenses: [],
}

/** Renders the form at /expenses/new with a fresh store (no localStorage persistence). */
function renderForm() {
  const store = configureStore({
    reducer: { expenses: expensesReducer },
    preloadedState: { expenses: structuredClone(trip) },
  })
  const user = userEvent.setup()
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/expenses/new']}>
        <Routes>
          <Route path="/" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<AddExpensePage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
  return { store, user }
}

const save = () => screen.getByRole('button', { name: 'Save' })

/** Opens a dropdown by its label and clicks one of its options. */
async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string | RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(screen.getByRole('option', { name: option }))
}

describe('AddExpensePage', () => {
  it('shows an error next to each invalid field and saves nothing', async () => {
    const { store, user } = renderForm()

    await user.click(save())

    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription(
      'Description is required',
    )
    expect(screen.getByLabelText('Amount (₹)')).toHaveAccessibleDescription('Amount is required')
    expect(screen.getByLabelText('Paid by')).toHaveAccessibleDescription('Choose who paid')
    expect(screen.getByLabelText('Category')).toHaveAccessibleDescription('Choose a category')
    expect(screen.getByLabelText('Description')).toHaveFocus()

    expect(store.getState().expenses.expenses).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('rejects a negative amount and an exact split that does not add up', async () => {
    const { store, user } = renderForm()

    await user.type(screen.getByLabelText('Description'), 'Taxi')
    await user.type(screen.getByLabelText('Amount (₹)'), '-5')
    await user.click(screen.getByLabelText('Exact amounts'))
    await user.type(screen.getByLabelText('Asha'), '60')
    await user.click(save())

    expect(screen.getByLabelText('Amount (₹)')).toHaveAccessibleDescription(
      'Amount must be more than ₹0',
    )

    await user.clear(screen.getByLabelText('Amount (₹)'))
    await user.type(screen.getByLabelText('Amount (₹)'), '100')
    expect(screen.getByText('₹40.00 left to assign')).toBeInTheDocument()

    expect(store.getState().expenses.expenses).toHaveLength(0)
  })

  it('dispatches the expense and navigates to Expenses with an added message', async () => {
    const { store, user } = renderForm()

    await user.type(screen.getByLabelText('Description'), 'Beach dinner')
    await user.type(screen.getByLabelText('Amount (₹)'), '1250.50')
    await choose(user, 'Paid by', 'Bala')
    await choose(user, 'Category', /^Food/)
    // Equal split starts with every member ticked; leave Chitra out.
    await user.click(screen.getByRole('checkbox', { name: 'Chitra' }))
    await user.click(save())

    const saved = store.getState().expenses.expenses
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      description: 'Beach dinner',
      amount: 125050,
      paidBy: 'm2',
      category: 'Food',
      split: { type: 'equal', memberIds: ['m1', 'm2'] },
    })
    expect(saved[0]?.id).toEqual(expect.any(String))

    expect(screen.getByRole('heading', { name: 'Expenses' })).toBeInTheDocument()
    expect(within(screen.getByRole('status')).getByText('Added “Beach dinner”.')).toBeInTheDocument()
  })

  it('stores percent shares as percentages when they add up to exactly 100', async () => {
    const { store, user } = renderForm()

    await user.type(screen.getByLabelText('Description'), 'Villa')
    await user.type(screen.getByLabelText('Amount (₹)'), '100')
    await choose(user, 'Paid by', 'Asha')
    await choose(user, 'Category', /^Stay/)
    await user.click(screen.getByLabelText('Percentages'))
    await user.type(screen.getByLabelText('Asha'), '33.33')
    await user.type(screen.getByLabelText('Bala'), '33.33')
    await user.type(screen.getByLabelText('Chitra'), '33.34')
    await user.click(save())

    expect(store.getState().expenses.expenses[0]?.split).toEqual({
      type: 'percent',
      shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
    })
  })
})
