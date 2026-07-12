import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET', 'super-secret-assetflow-dev-key-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '24h',
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};
