import { expect, test } from '@playwright/test'

test('standard_user can log in and see Products', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('username').fill('standard_user')
  await page.getByTestId('password').fill('secret_sauce')
  await page.getByTestId('login-button').click()

  const title = page.getByTestId('title')
  await expect(title).toBeVisible()
  await expect(title).toHaveText('Products')
})

test('locked out user sees an error', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('username').fill('locked_out_user')
  await page.getByTestId('password').fill('secret_sauce')
  await page.getByTestId('login-button').click()

  // Matches "Epic sadface: Sorry, this user has been locked out." on its visible text.
  await expect(page.getByText(/locked out/i)).toBeVisible()
})
