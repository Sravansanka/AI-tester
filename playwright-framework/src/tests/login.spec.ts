import { test, expect } from '@fixtures';

test.describe('@P0 @Login Login Tests', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.navigate('/login');
  });

  test('should login with valid credentials', async ({ loginModule, homePage }) => {
    await test.step('Login with default credentials', async () => {
      await loginModule.doLogin();
    });

    await test.step('Verify redirect to home page', async () => {
      const title = await homePage.getTitle();
      expect(title).toContain('Dashboard');
    });
  });

  test('should show error for invalid credentials', async ({ loginModule }) => {
    await test.step('Attempt login with wrong password', async () => {
      await loginModule.doLogin('validuser', 'wrongpassword');
    });

    await test.step('Verify error message displayed', async () => {
      await loginModule.verifyLoginFailed('Invalid credentials');
    });
  });

  test('should login with remember me', async ({ loginModule }) => {
    await test.step('Login with Remember Me checked', async () => {
      await loginModule.doLoginWithRememberMe('user@test.com', 'pass123');
    });
  });

  test('@Smoke should display login page correctly', async ({ loginPage }) => {
    await test.step('Verify login form elements visible', async () => {
      await expect(loginPage.usernameInput()).toBeVisible();
      await expect(loginPage.passwordInput()).toBeVisible();
      await expect(loginPage.submitBtn()).toBeVisible();
    });
  });
});
