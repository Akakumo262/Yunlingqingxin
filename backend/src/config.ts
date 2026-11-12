import { PORTS } from '@yunling/contracts';

export const config = {
  port: Number(process.env.PORT ?? PORTS.api),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  accessTtlSec: 15 * 60,
  refreshTtlSec: 7 * 24 * 3600,
  /** 未配置时使用内存数据 */
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: (process.env.CORS_ORIGINS ?? `http://localhost:${PORTS.web},http://localhost:${PORTS.miniappH5}`).split(','),
  enableDevLogin: process.env.ENABLE_DEV_LOGIN !== 'false',
};
