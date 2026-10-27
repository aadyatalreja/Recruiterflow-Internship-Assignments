import type { Expense } from '../domain/types'
import { SAMPLE_TRIP_DATA } from './expensesSlice'

export const STORAGE_KEY = 'trip-splitter:expenses'

/**
 * Reads persisted expenses, falling back to the sample data when nothing is stored,
 * the stored value is not valid JSON, or localStorage itself is unavailable.
 * Only expenses are persisted; members always come from the sample data.
 */
export function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return SAMPLE_TRIP_DATA.expenses
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Expense[]) : SAMPLE_TRIP_DATA.expenses
  } catch {
    return SAMPLE_TRIP_DATA.expenses
  }
}

interface PersistableStore {
  getState(): { expenses: { expenses: Expense[] } }
  subscribe(listener: () => void): () => void
}

/**
 * Persistence lives in a store subscription rather than inside components so that every
 * state change is saved regardless of which component (or test, or devtools action)
 * dispatched it. Components stay focused on rendering and dispatching, no component has
 * to remember to save, and there is exactly one place that touches localStorage.
 */
export function persistExpenses(store: PersistableStore): () => void {
  let lastSaved = store.getState().expenses.expenses
  return store.subscribe(() => {
    const expenses = store.getState().expenses.expenses
    // Immer keeps the array reference stable when expenses didn't change, so skip no-op writes.
    if (expenses === lastSaved) return
    lastSaved = expenses
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
    } catch {
      // Storage full or unavailable (e.g. private mode): keep running with in-memory state.
    }
  })
}
