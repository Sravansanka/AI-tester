import { test, expect } from '@fixtures';
import { DataGenerator } from '@utils/DataGenerator';

test.describe('@P0 @Checkout Checkout Tests', () => {
  test.beforeEach(async ({ loginModule, productModule }) => {
    await loginModule.doLogin();
    await productModule.addProductToCart('Wireless Headphones');
  });

  test('should complete full checkout', async ({ checkoutModule }) => {
    const { firstName, lastName } = DataGenerator.randomName();
    const { cardNumber, expiry, cvv } = DataGenerator.creditCard();

    const orderId = await test.step('Complete checkout flow', async () => {
      return await checkoutModule.completeCheckout(
        {
          firstName,
          lastName,
          address: `${DataGenerator.randomInt(1, 999)} Test Street`,
          city: 'Testville',
          zipCode: String(DataGenerator.randomInt(10000, 99999)),
        },
        { cardNumber, expiry, cvv },
      );
    });

    await test.step('Verify order confirmation', async () => {
      await checkoutModule.verifyOrderConfirmed(orderId);
    });
  });

  test('should complete checkout with static data', async ({ checkoutModule }) => {
    const orderId = await test.step('Fill checkout with known data', async () => {
      return await checkoutModule.completeCheckout(
        {
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Test St',
          city: 'Testville',
          zipCode: '12345',
        },
        {
          cardNumber: '4111111111111111',
          expiry: '12/28',
          cvv: '123',
        },
      );
    });

    await test.step('Verify order ID is returned', async () => {
      expect(orderId).toBeTruthy();
    });
  });
});
