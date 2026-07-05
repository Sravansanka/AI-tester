import { Page, expect } from '@playwright/test';
import { ProductPage } from '@pages/ProductPage';
import { Logger } from '@utils/Logger';

export class ProductModule {
  private logger: Logger;

  constructor(
    private page: Page,
    private productPage: ProductPage,
  ) {
    this.logger = new Logger('ProductModule');
  }

  async addProductToCart(productName: string, quantity: number = 1): Promise<void> {
    this.logger.info(`Adding ${quantity}x "${productName}" to cart`);
    await this.productPage.searchProduct(productName);
    await this.productPage.setQuantity(quantity);
    await this.productPage.clickAddToCart();
    await this.productPage.waitForPageLoad();
    this.logger.info('Product added to cart');
  }

  async verifyCartCount(expected: number): Promise<void> {
    const count = await this.productPage.getCartCount();
    expect(Number(count)).toBe(expected);
    this.logger.info(`Cart count verified: ${expected}`);
  }

  async searchAndVerifyResults(query: string, minResults: number): Promise<void> {
    this.logger.info(`Searching for: "${query}"`);
    await this.productPage.searchProduct(query);
    const count = await this.productPage.productCards().count();
    expect(count).toBeGreaterThanOrEqual(minResults);
    this.logger.info(`Found ${count} results for "${query}"`);
  }
}
