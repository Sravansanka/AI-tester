import { test as base } from '@playwright/test';
import { LoginPage, HomePage, ProductPage, CheckoutPage } from '@pages/index';
import { LoginModule, ProductModule, CheckoutModule } from '@modules/index';

type TestFixtures = {
  loginPage: LoginPage;
  homePage: HomePage;
  productPage: ProductPage;
  checkoutPage: CheckoutPage;
  loginModule: LoginModule;
  productModule: ProductModule;
  checkoutModule: CheckoutModule;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  loginModule: async ({ page, loginPage }, use) => {
    await use(new LoginModule(page, loginPage));
  },
  productModule: async ({ page, productPage }, use) => {
    await use(new ProductModule(page, productPage));
  },
  checkoutModule: async ({ page, checkoutPage }, use) => {
    await use(new CheckoutModule(page, checkoutPage));
  },
});

export { expect } from '@playwright/test';
