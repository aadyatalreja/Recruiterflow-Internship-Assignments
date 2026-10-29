# QA Automation Take-Home — Playwright + TypeScript

A small Playwright + TypeScript suite with two halves: UI tests against the
[saucedemo.com](https://www.saucedemo.com) demo shop, and API tests against
[reqres.in](https://reqres.in). Everything runs in Chromium.

## Before you start

You'll need two things:

- **Node 20 or newer.** The brief says 18+, but the current version of Playwright (1.64) won't
  run on anything older than 20.
- **A free ReqRes API key.** ReqRes now rejects requests without one (you just get a `401`).
  Sign up on [reqres.in](https://reqres.in), copy your key, and put it in `qa/.env`. The
  [`.env.example`](.env.example) file shows the variable name:

  ```
  REQRES_API_KEY=your-key-here
  ```

  `.env` is git-ignored, so the key never ends up in the repo. The API tests send it as the
  `x-api-key` header.

## Install

```bash
cd qa
npm install
npx playwright install chromium
cp .env.example .env   # then paste your key into .env
```

## Run

```bash
npx playwright test
```

Run it from inside `qa/`. You can add `tests/ui` or `tests/api` to run just one half, `--headed`
to watch the browser, or `--ui` to step through the tests one by one. If anything fails, an HTML
report opens with a trace you can replay.

## What's covered

**UI tests** (`tests/ui/`)
- `standard_user` logs in and sees the Products title
- `locked_out_user` gets an error containing "locked out"
- adding a product shows a cart badge of 1
- removing it again makes the badge disappear *(bonus)*
- logging out from the side menu goes back to the login page *(bonus)*

**API tests** (`tests/api/`)
- `GET /api/users/2` returns 200 and a non-empty `data.email`
- `POST /api/users` with `{ name: "morpheus", job: "leader" }` returns 201 and `name: "morpheus"`
- `GET /api/users/23` returns 404 *(bonus)*

The login steps live in a small Page Object, [`pages/LoginPage.ts`](pages/LoginPage.ts) *(bonus)*,
so the tests don't repeat them. For locators I stuck to `getByTestId` and `getByRole`: saucedemo
puts a `data-test` attribute on its elements, so I set `testIdAttribute: 'data-test'` in
[`playwright.config.ts`](playwright.config.ts) and used those instead of long CSS selectors.

## Reflection

I finished all five core tests (three UI, two API) and all four bonus items, and the full suite of
8 tests passes. One challenge that I faced was that the logout test kept
timing out because I was looking for a link, when the menu item is really a button. That taught me
to inspect an element's actual role before writing a locator. With more time I'd cover the
checkout flow and run the suite in CI on every push.
