# Trip Splitter

Five friends, one Goa trip, and nobody sure who owes whom. This app records shared expenses, splits
each one equally, by exact amounts or by percentages, and shows everyone's balance.

## Running it

You'll need Node 22.13 or newer.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run build      # type-check and production build
```

The app starts from `src/data/sample-data.json` and saves to `localStorage`. To start over, clear
the `trip-splitter:expenses` key. A few of the UI effects are adapted from
[React Bits](https://reactbits.dev) and ported to strict TypeScript.

### Not finished yet

- Expenses can be added and deleted, but not edited.
- Members are fixed to the sample data.
- There's no "settle up" view suggesting who should pay whom.
- The Expenses page tests only cover deleting, not the filter or totals.

## Three decisions

**1. Saving happens in one place.** `store/persistence.ts` loads expenses once at startup, and falls
back to the sample data if nothing is saved, the JSON is broken or an expense has the wrong shape.
It then subscribes to the store and writes back after every change. Components never touch
`localStorage`, so no screen can forget to save, and the reducers stay pure and easy to test.

**2. Money is whole paise, and every split adds up exactly.** Amounts are parsed from the typed
string (`parseRupees`), never with `parseFloat`, and percentages become whole basis points, so
33.33 + 33.33 + 33.34 is exactly 10000. When a split doesn't divide evenly, the leftover paise go
one each to the first members in the list, so ₹100 between three is 33.34 + 33.33 + 33.33. Percent
splits use the largest-remainder method. Every expense's shares add up to its amount, and all
balances add up to zero.

**3. The form keeps exactly what was typed.** Form state is raw strings. `domain/validation.ts`
turns them into a `field → message` map, and `buildExpense` turns a valid form into an `Expense`.
Without a form library the rules are tested without React, the UI just shows each message next to
its field, and errors update live once you've tried to save.

## With another day

- Editing an expense, reusing the same form and validation.
- A settle-up view suggesting the fewest payments to clear every balance.
- An in-app confirm dialog instead of `window.confirm`, and an undo after deleting.
- Telling the user when saved data couldn't be read, instead of quietly falling back.
- Tests for the Expenses filter and totals, plus one end-to-end add → list → delete test.

## How I used AI tools

I used an AI assistant as a pair programmer: to talk through approaches, draft code from the
behaviour I described, and port the React Bits components to strict TypeScript. I made the calls on
state, money handling and design, reviewed every change in the browser, and ran typecheck, lint and
tests before each commit.
