import { expect, test } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'

test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('standard_user', 'secret_sauce')
})

test('adding a product shows cart badge 1', async ({ page }) => {
  await page.getByRole('button', { name: 'Add to cart' }).first().click()

  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1')
})

test('removing the product hides the cart badge', async ({ page }) => {
  const badge = page.getByTestId('shopping-cart-badge')
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(badge).toHaveText('1')

  await page.getByRole('button', { name: 'Remove' }).click()

  await expect(badge).toBeHidden()
})
