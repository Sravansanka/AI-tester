import { APIRequestContext } from '@playwright/test';
import { ApiHelper } from '@utils/ApiHelper';
import { config } from '@config/index';
import { Order } from '@testdata/types';

export class OrderApi {
  private api: ApiHelper;

  constructor(request: APIRequestContext) {
    this.api = new ApiHelper(request, config.baseUrl);
  }

  async getOrders(token: string): Promise<Order[]> {
    return this.api.get('/api/orders', { Authorization: `Bearer ${token}` });
  }

  async getOrderById(id: string, token: string): Promise<Order> {
    return this.api.get(`/api/orders/${id}`, { Authorization: `Bearer ${token}` });
  }

  async createOrder(orderData: unknown, token: string): Promise<Order> {
    return this.api.post('/api/orders', orderData, { Authorization: `Bearer ${token}` });
  }

  async cancelOrder(id: string, token: string): Promise<Order> {
    return this.api.put(`/api/orders/${id}/cancel`, {}, { Authorization: `Bearer ${token}` });
  }
}
