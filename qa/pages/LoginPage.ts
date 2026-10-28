import type { Locator, Page } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly username: Locator
  readonly password: Locator
  readonly loginButton: Locator

  constructor(page: Page) {
    this.page = page
    this.username = page.getByTestId('username')
    this.password = page.getByTestId('password')
    this.loginButton = page.getByTestId('login-button')
  }

  async goto() {
    await this.page.goto('/')
  }

  async login(username: string, password: string) {
    await this.username.fill(username)
    await this.password.fill(password)
    await this.loginButton.click()
  }
}
