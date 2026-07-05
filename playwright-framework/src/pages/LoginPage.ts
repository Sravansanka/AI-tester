import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  usernameInput = () => this.page.locator('#username');
  passwordInput = () => this.page.locator('#password');
  submitBtn = () => this.page.getByRole('button', { name: 'Login' });
  errorMessage = () => this.page.locator('.error-message');
  rememberMeCheckbox = () => this.page.getByLabel('Remember me');
  forgotPasswordLink = () => this.page.getByRole('link', { name: 'Forgot password?' });

  async fillUsername(username: string): Promise<void> {
    await this.usernameInput().fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput().fill(password);
  }

  async clickSubmit(): Promise<void> {
    await this.submitBtn().click();
  }

  async clickRememberMe(): Promise<void> {
    await this.rememberMeCheckbox().check();
  }

  async getErrorText(): Promise<string> {
    return this.errorMessage().textContent() ?? '';
  }
}
