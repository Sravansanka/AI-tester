import { APIRequestContext } from '@playwright/test';
import { ApiHelper } from '@utils/ApiHelper';
import { config } from '@config/index';
import { Product } from '@testdata/types';

export class ProductApi {
  private api: ApiHelper;

  constructor(request: APIRequestContext) {
    this.api = new ApiHelper(request, config.baseUrl);
  }

  async getProducts(token: string): Promise<Product[]> {
    return this.api.get('/api/products', { Authorization: `Bearer ${token}` });
  }

  async getProductById(id: string, token: string): Promise<Product> {
    return this.api.get(`/api/products/${id}`, { Authorization: `Bearer ${token}` });
  }

  async searchProducts(query: string, token: string): Promise<Product[]> {
    return this.api.get(`/api/products?q=${encodeURIComponent(query)}`, {
      Authorization: `Bearer ${token}`,
    });
  }

  async createProduct(product: Omit<Product, 'id'>, token: string): Promise<Product> {
    return this.api.post('/api/products', product, { Authorization: `Bearer ${token}` });
  }

  async deleteProduct(id: string, token: string): Promise<number> {
    return this.api.delete(`/api/products/${id}`, { Authorization: `Bearer ${token}` });
  }
}
