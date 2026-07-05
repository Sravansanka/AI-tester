import { test, expect } from '@fixtures';
import products from '@testdata/products.json';

test.describe('@P1 @Product Product Tests', () => {
  test.beforeEach(async ({ loginModule }) => {
    await loginModule.doLogin();
  });

  test('should add product to cart', async ({ productModule }) => {
    await test.step('Search and add product', async () => {
      await productModule.addProductToCart('Wireless Headphones', 2);
    });

    await test.step('Verify cart updated', async () => {
      await productModule.verifyCartCount(2);
    });
  });

  test('should search and find products', async ({ productModule }) => {
    await test.step('Search for laptops', async () => {
      await productModule.searchAndVerifyResults('laptop', 1);
    });
  });

  test('@Smoke should display product list', async ({ productPage, loginModule }) => {
    await test.step('Navigate to products page', async () => {
      await productPage.navigate('/products');
    });

    await test.step('Verify products are listed', async () => {
      const count = await productPage.productCards().count();
      expect(count).toBeGreaterThan(0);
    });
  });

  for (const product of products) {
    test(`@Regression should find product: ${product.name}`, async ({ productModule }) => {
      await test.step(`Search for ${product.name}`, async () => {
        await productModule.searchAndVerifyResults(product.name, 1);
      });
    });
  }
});
