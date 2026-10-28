import { expect, test } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'

test('standard_user can log in and see Products', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('standard_user', 'secret_sauce')

  const title = page.getByTestId('title')
  await expect(title).toBeVisible()
  await expect(title).toHaveText('Products')
})

test('locked out user sees an error', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('locked_out_user', 'secret_sauce')

  // Matches "Epic sadface: Sorry, this user has been locked out." on its visible text.
  await expect(page.getByText(/locked out/i)).toBeVisible()
})

test('logging out from the side menu returns to the login page', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('standard_user', 'secret_sauce')
  await expect(page.getByTestId('title')).toHaveText('Products')

  await page.getByRole('button', { name: 'Open Menu' }).click()
  await page.getByRole('button', { name: 'Logout' }).click()

  await expect(page).toHaveURL('/')
  await expect(loginPage.loginButton).toBeVisible()
})
