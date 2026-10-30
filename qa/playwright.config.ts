import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Loads qa/.env (e.g. REQRES_API_KEY for the API tests) into process.env. The file is
// git-ignored; .env.example lists the variables it needs.
dotenv.config({ quiet: true })

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Fail if a test.only is left in by mistake.
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'html',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // Browser tests against the saucedemo shop, in Chromium.
      name: 'ui',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.saucedemo.com',
        // saucedemo marks its elements with data-test="...", so getByTestId('login-button') finds them.
        testIdAttribute: 'data-test',
      },
    },
    {
      // HTTP-only tests against reqres.in. They use the request fixture, so no browser opens.
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: 'https://reqres.in',
        extraHTTPHeaders: { 'x-api-key': process.env.REQRES_API_KEY ?? '' },
      },
    },
  ],
})
