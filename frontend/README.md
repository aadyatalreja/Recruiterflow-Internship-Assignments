# Trip Splitter

Track shared trip expenses and see who owes whom.

## Running it

Requires Node 22.13 or newer.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run build      # type-check and production build
```

Data starts from `src/data/sample-data.json` and is saved to `localStorage`. Clear the `trip-splitter:expenses` key to reset.

### Unfinished

- Expenses can be added and deleted, not edited.
- Members are fixed to the sample data.
- There is no "settle up" view suggesting who should pay whom.
- Delete confirms with the browser's native dialog.
- The Expenses page has no component tests yet.

## Three decisions

**1. Persistence lives in a store subscription.** `store/persistence.ts` loads expenses once at startup (falling back to the sample data if nothing is stored or the JSON is corrupt) and subscribes to the store to write them back after every change. Components never touch `localStorage`, so no screen can forget to save, and the reducers stay pure and easy to test.

**2. Money is integer paise, and every split adds up exactly.** Amounts are parsed from strings with string maths (`parseRupees`), never `parseFloat`, and percentages become integer basis points, so 33.33 + 33.33 + 33.34 is exactly 10000. When a split doesn't divide evenly, the leftover paise are assigned deterministically. An equal split gives one extra paisa each to the first members in the list (₹100 / 3 = 33.34 + 33.33 + 33.33). A percent split uses the largest-remainder method. Each expense's shares therefore sum to its amount, and all balances sum to zero.

**3. The form keeps raw strings; validation is a pure function.** Form state is exactly what the user typed. `domain/validation.ts` turns it into a `field → message` map, and `buildExpense` converts a valid form into an `Expense`. No form library: the rules are unit-tested without React, the UI just renders the map next to each field, and errors update live once the user has tried to save.

## With another day

- Edit an expense, reusing the same form and validation.
- A settle-up view that suggests the fewest payments needed to clear all balances.
- Replace `window.confirm` with an accessible dialog, plus an undo toast after deleting.
- Validate the shape of data loaded from `localStorage`, not just that it is an array.
- Component tests for the Expenses page (filter, totals, delete) and one end-to-end test of the add → list → delete flow.

## How I used AI tools
