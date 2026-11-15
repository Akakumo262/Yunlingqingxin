import { PORTS } from '@yunling/contracts';

const requiredSecret = (name: string, fallback: string) => {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} must be configured in production`);
  return fallback;
};

export const config = {
  port: Number(process.env.PORT ?? PORTS.api),
  jwtSecret: requiredSecret('JWT_SECRET', 'local-development-jwt-secret-change-me'),
  accessTtlSec: 15 * 60,
  refreshTtlSec: 7 * 24 * 3600,
  databaseUrl: process.env.DATABASE_URL,
  dataEncryptionKey: requiredSecret('DATA_ENCRYPTION_KEY', 'local-development-data-key-change-me'),
  corsOrigins: (process.env.CORS_ORIGINS ?? `http://localhost:${PORTS.web},http://localhost:${PORTS.miniappH5}`).split(','),
  enableDevLogin: process.env.ENABLE_DEV_LOGIN !== 'false',
};
