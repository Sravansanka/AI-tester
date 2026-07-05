import { APIRequestContext } from '@playwright/test';
import { ApiHelper } from '@utils/ApiHelper';
import { config } from '@config/index';

export class AuthApi {
  private api: ApiHelper;

  constructor(request: APIRequestContext) {
    this.api = new ApiHelper(request, config.baseUrl);
  }

  async login(username: string, password: string): Promise<{ token: string }> {
    return this.api.post('/api/auth/login', { username, password });
  }

  async register(email: string, password: string): Promise<{ userId: string }> {
    return this.api.post('/api/auth/register', { email, password });
  }

  async refreshToken(token: string): Promise<{ token: string }> {
    return this.api.post('/api/auth/refresh', {}, { Authorization: `Bearer ${token}` });
  }

  async logout(token: string): Promise<void> {
    await this.api.post('/api/auth/logout', {}, { Authorization: `Bearer ${token}` });
  }
}
