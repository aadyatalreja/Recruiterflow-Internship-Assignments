# QA Automation

Playwright + TypeScript tests: UI tests against [saucedemo.com](https://www.saucedemo.com) and API
tests against [reqres.in](https://reqres.in). Chromium only.

## Install

Requires Node 20 or newer.

```bash
cd qa
npm install
npx playwright install chromium
cp .env.example .env   # then add your ReqRes API key
```

## Run

```bash
npx playwright test              # everything
npx playwright test tests/ui     # UI tests only
npx playwright test tests/api    # API tests only
npx playwright show-report       # open the last HTML report, if one was generated
```

## Tests

_To be filled in._
