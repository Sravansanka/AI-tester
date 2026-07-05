import { test as base, BrowserContext } from '@playwright/test';
import { config } from '@config/index';

type AuthFixtures = {
  authenticatedPage: ReturnType<BrowserContext['newPage']> extends Promise<infer P> ? P : never;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.locator('#username').fill(config.credentials.username);
    await page.locator('#password').fill(config.credentials.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForLoadState('networkidle');
    await use(page);
  },
});
