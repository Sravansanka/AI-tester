import { Page, expect } from '@playwright/test';
import { CheckoutPage } from '@pages/CheckoutPage';
import { Logger } from '@utils/Logger';

interface ShippingInfo {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  zipCode: string;
}

interface PaymentInfo {
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export class CheckoutModule {
  private logger: Logger;

  constructor(
    private page: Page,
    private checkoutPage: CheckoutPage,
  ) {
    this.logger = new Logger('CheckoutModule');
  }

  async completeCheckout(shippingInfo: ShippingInfo, paymentInfo: PaymentInfo): Promise<string> {
    this.logger.info('Starting checkout flow');

    await this.fillShippingDetails(shippingInfo);
    await this.fillPaymentDetails(paymentInfo);
    await this.checkoutPage.clickPlaceOrder();
    await this.checkoutPage.waitForPageLoad();

    const orderId = await this.checkoutPage.getOrderConfirmationId();
    this.logger.info(`Checkout complete. Order ID: ${orderId}`);
    return orderId;
  }

  async verifyOrderConfirmed(orderId: string): Promise<void> {
    expect(orderId).toBeTruthy();
    this.logger.info(`Order confirmed: ${orderId}`);
  }

  private async fillShippingDetails(info: ShippingInfo): Promise<void> {
    await this.checkoutPage.fillFirstName(info.firstName);
    await this.checkoutPage.fillLastName(info.lastName);
    await this.checkoutPage.fillAddress(info.address);
    await this.checkoutPage.fillCity(info.city);
    await this.checkoutPage.fillZipCode(info.zipCode);
    await this.checkoutPage.clickContinue();
  }

  private async fillPaymentDetails(info: PaymentInfo): Promise<void> {
    await this.checkoutPage.fillCardNumber(info.cardNumber);
    await this.checkoutPage.fillExpiry(info.expiry);
    await this.checkoutPage.fillCVV(info.cvv);
  }
}
