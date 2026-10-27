import { configureStore } from '@reduxjs/toolkit'
import expensesReducer, { SAMPLE_TRIP_DATA } from './expensesSlice'
import { loadExpenses, persistExpenses } from './persistence'

export const store = configureStore({
  reducer: { expenses: expensesReducer },
  preloadedState: {
    expenses: { members: SAMPLE_TRIP_DATA.members, expenses: loadExpenses() },
  },
})

persistExpenses(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
