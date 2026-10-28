# QA Automation

Playwright + TypeScript tests for the [saucedemo.com](https://www.saucedemo.com) shop (UI) and the
[reqres.in](https://reqres.in) API, run in Chromium.

## Prerequisites

- **Node 20 or newer.** The brief says 18+, but the current Playwright (1.64) needs Node 20.
- **A free ReqRes API key.** Without it, reqres.in answers every request with `401`. Create an
  account on [reqres.in](https://reqres.in), copy the key, and put it in `qa/.env`.
  [`.env.example`](.env.example) shows the variable name:

  ```
  REQRES_API_KEY=your-key-here
  ```

  `.env` is git-ignored. The API tests send the key as the `x-api-key` header.

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

Run it from inside `qa/`. Add `tests/ui` or `tests/api` to run one part, `--headed` to watch the
browser, or `--ui` to step through tests interactively. Failures open an HTML report with a trace.

## What's covered

**UI** (saucedemo, `tests/ui/`)
- `standard_user` logs in and sees the Products title
- `locked_out_user` sees an error containing "locked out"
- adding a product shows cart badge 1
- removing the product hides the cart badge *(bonus)*
- logging out from the side menu returns to the login page *(bonus)*

**API** (reqres.in, `tests/api/`)
- `GET /api/users/2` returns 200 with a non-empty `data.email`
- `POST /api/users` with `{ name: "morpheus", job: "leader" }` returns 201 and `name: "morpheus"`
- `GET /api/users/23` returns 404 *(bonus)*

The login steps live in a Page Object, [`pages/LoginPage.ts`](pages/LoginPage.ts) *(bonus)*.
Elements are found with `getByTestId` (saucedemo's `data-test` attributes, set via
`testIdAttribute` in [`playwright.config.ts`](playwright.config.ts)) or `getByRole`.
