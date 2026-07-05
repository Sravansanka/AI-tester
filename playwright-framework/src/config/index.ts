import dotenv from 'dotenv';
dotenv.config();

export const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  credentials: {
    username: process.env.TEST_USERNAME || 'testuser',
    password: process.env.TEST_PASSWORD || 'testpass123',
  },
  api: {
    timeout: Number(process.env.API_TIMEOUT) || 30_000,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'INFO',
  },
} as const;
