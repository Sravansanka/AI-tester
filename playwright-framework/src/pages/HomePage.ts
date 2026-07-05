import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  navMenu = () => this.page.locator('[data-testid="nav-menu"]');
  userAvatar = () => this.page.locator('[data-testid="user-avatar"]');
  logoutBtn = () => this.page.getByRole('button', { name: 'Logout' });
  welcomeMessage = () => this.page.locator('[data-testid="welcome-message"]');
  dashboardHeader = () => this.page.getByRole('heading', { level: 1 });

  async getWelcomeText(): Promise<string> {
    return this.welcomeMessage().textContent() ?? '';
  }

  async clickLogout(): Promise<void> {
    await this.userAvatar().click();
    await this.logoutBtn().click();
  }

  async getDashboardHeading(): Promise<string> {
    return this.dashboardHeader().textContent() ?? '';
  }
}
