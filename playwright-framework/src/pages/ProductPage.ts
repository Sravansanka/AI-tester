import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  productTitle = () => this.page.locator('[data-testid="product-title"]');
  productPrice = () => this.page.locator('[data-testid="product-price"]');
  addToCartBtn = () => this.page.getByRole('button', { name: 'Add to Cart' });
  quantityInput = () => this.page.locator('#quantity');
  cartBadge = () => this.page.locator('[data-testid="cart-badge"]');
  searchInput = () => this.page.getByPlaceholder('Search products...');
  productCards = () => this.page.locator('[data-testid="product-card"]');

  async setQuantity(qty: number): Promise<void> {
    await this.quantityInput().fill(String(qty));
  }

  async clickAddToCart(): Promise<void> {
    await this.addToCartBtn().click();
  }

  async searchProduct(query: string): Promise<void> {
    await this.searchInput().fill(query);
    await this.searchInput().press('Enter');
  }

  async getCartCount(): Promise<string> {
    return this.cartBadge().textContent() ?? '0';
  }

  async getProductTitle(): Promise<string> {
    return this.productTitle().textContent() ?? '';
  }

  async getProductPrice(): Promise<string> {
    return this.productPrice().textContent() ?? '';
  }
}
