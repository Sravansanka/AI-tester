import { Page, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { Logger } from '@utils/Logger';
import { config } from '@config/index';

export class LoginModule {
  private logger: Logger;

  constructor(
    private page: Page,
    private loginPage: LoginPage,
  ) {
    this.logger = new Logger('LoginModule');
  }

  async doLogin(
    username: string = config.credentials.username,
    password: string = config.credentials.password,
  ): Promise<void> {
    this.logger.info(`Logging in as: ${username}`);
    await this.loginPage.navigate('/login');
    await this.loginPage.fillUsername(username);
    await this.loginPage.fillPassword(password);
    await this.loginPage.clickSubmit();
    await this.loginPage.waitForPageLoad();
    this.logger.info('Login completed');
  }

  async doLoginWithRememberMe(username: string, password: string): Promise<void> {
    this.logger.info(`Logging in with Remember Me as: ${username}`);
    await this.loginPage.navigate('/login');
    await this.loginPage.fillUsername(username);
    await this.loginPage.fillPassword(password);
    await this.loginPage.clickRememberMe();
    await this.loginPage.clickSubmit();
    await this.loginPage.waitForPageLoad();
  }

  async doLogout(): Promise<void> {
    this.logger.info('Logging out');
    await this.page.goto('/logout');
    await this.loginPage.waitForPageLoad();
  }

  async verifyLoginFailed(expectedError: string): Promise<void> {
    const errorText = await this.loginPage.getErrorText();
    expect(errorText).toContain(expectedError);
    this.logger.warn(`Login failed as expected: ${expectedError}`);
  }
}
