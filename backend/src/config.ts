import { PORTS } from '@yunling/contracts';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envCandidates = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '..', '.env.local'),
  resolve(__dirname, '..', '..', '.env.local'),
];
const localEnv = envCandidates.find((candidate) => existsSync(candidate));
if (localEnv) process.loadEnvFile(localEnv);

export const config = {
  port: Number(process.env.PORT ?? PORTS.api),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY ?? 'dev-only-data-key-change-me',
  accessTtlSec: 15 * 60,
  refreshTtlSec: 7 * 24 * 3600,
  /** 未配置时使用内存数据 */
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: (process.env.CORS_ORIGINS ?? `http://localhost:${PORTS.web},http://localhost:${PORTS.miniappH5}`).split(','),
  enableDevLogin: process.env.ENABLE_DEV_LOGIN !== 'false',
};
