import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import sampleData from '../data/sample-data.json'
import type { Expense, TripData } from '../domain/types'

// The JSON import widens literals (e.g. category becomes string), so assert the domain shape.
export const SAMPLE_TRIP_DATA = sampleData as TripData

const initialState: TripData = SAMPLE_TRIP_DATA

// Members are read-only: the UI never edits them, so there are no member reducers.
const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    addExpense(state, action: PayloadAction<Expense>) {
      state.expenses.push(action.payload)
    },
    deleteExpense(state, action: PayloadAction<string>) {
      state.expenses = state.expenses.filter((e) => e.id !== action.payload)
    },
  },
})

export const { addExpense, deleteExpense } = expensesSlice.actions
export default expensesSlice.reducer
