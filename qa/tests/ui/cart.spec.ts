import { expect, test } from '@playwright/test'

test('adding a product shows cart badge 1', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('username').fill('standard_user')
  await page.getByTestId('password').fill('secret_sauce')
  await page.getByTestId('login-button').click()

  await page.getByRole('button', { name: 'Add to cart' }).first().click()

  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1')
})

test('removing the product hides the cart badge', async ({ page }) => {
  await page.goto('/')

  await page.getByTestId('username').fill('standard_user')
  await page.getByTestId('password').fill('secret_sauce')
  await page.getByTestId('login-button').click()

  const badge = page.getByTestId('shopping-cart-badge')
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(badge).toHaveText('1')

  await page.getByRole('button', { name: 'Remove' }).click()

  await expect(badge).toBeHidden()
})
