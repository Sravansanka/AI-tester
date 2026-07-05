import { APIRequestContext } from '@playwright/test';
import { Logger } from './Logger';

export class ApiHelper {
  private logger: Logger;

  constructor(
    private request: APIRequestContext,
    private baseURL: string,
  ) {
    this.logger = new Logger('ApiHelper');
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    this.logger.info(`GET ${endpoint}`);
    const response = await this.request.get(`${this.baseURL}${endpoint}`, { headers });
    const body = await response.json();
    this.logger.debug(`Response ${response.status()}`, body);
    return body as T;
  }

  async post<T>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> {
    this.logger.info(`POST ${endpoint}`);
    const response = await this.request.post(`${this.baseURL}${endpoint}`, { data, headers });
    const body = await response.json();
    this.logger.debug(`Response ${response.status()}`, body);
    return body as T;
  }

  async put<T>(endpoint: string, data: unknown, headers?: Record<string, string>): Promise<T> {
    this.logger.info(`PUT ${endpoint}`);
    const response = await this.request.put(`${this.baseURL}${endpoint}`, { data, headers });
    return (await response.json()) as T;
  }

  async delete(endpoint: string, headers?: Record<string, string>): Promise<number> {
    this.logger.info(`DELETE ${endpoint}`);
    const response = await this.request.delete(`${this.baseURL}${endpoint}`, { headers });
    return response.status();
  }
}
