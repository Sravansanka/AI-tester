import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  firstNameInput = () => this.page.locator('#firstName');
  lastNameInput = () => this.page.locator('#lastName');
  addressInput = () => this.page.locator('#address');
  cityInput = () => this.page.locator('#city');
  zipCodeInput = () => this.page.locator('#zipCode');
  continueBtn = () => this.page.getByRole('button', { name: 'Continue' });

  cardNumberInput = () => this.page.locator('#cardNumber');
  expiryInput = () => this.page.locator('#expiry');
  cvvInput = () => this.page.locator('#cvv');

  placeOrderBtn = () => this.page.getByRole('button', { name: 'Place Order' });
  orderConfirmationId = () => this.page.locator('[data-testid="order-id"]');
  orderSuccessBanner = () => this.page.locator('[data-testid="order-success"]');

  async fillFirstName(value: string): Promise<void> {
    await this.firstNameInput().fill(value);
  }

  async fillLastName(value: string): Promise<void> {
    await this.lastNameInput().fill(value);
  }

  async fillAddress(value: string): Promise<void> {
    await this.addressInput().fill(value);
  }

  async fillCity(value: string): Promise<void> {
    await this.cityInput().fill(value);
  }

  async fillZipCode(value: string): Promise<void> {
    await this.zipCodeInput().fill(value);
  }

  async clickContinue(): Promise<void> {
    await this.continueBtn().click();
  }

  async fillCardNumber(value: string): Promise<void> {
    await this.cardNumberInput().fill(value);
  }

  async fillExpiry(value: string): Promise<void> {
    await this.expiryInput().fill(value);
  }

  async fillCVV(value: string): Promise<void> {
    await this.cvvInput().fill(value);
  }

  async clickPlaceOrder(): Promise<void> {
    await this.placeOrderBtn().click();
  }

  async getOrderConfirmationId(): Promise<string> {
    return this.orderConfirmationId().textContent() ?? '';
  }
}
