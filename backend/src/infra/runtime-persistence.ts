import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { config } from '../config';

export interface RuntimeEvent {
  method: string;
  route: string;
  status: number;
  purpose?: string;
  requestId?: string;
  token?: string;
}

export interface DomainCommand {
  routeName: string;
  method: string;
  token?: string;
  purpose?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
}

/**
 * 可选 PostgreSQL 持久化边界。
 * 没有 DATABASE_URL 时后端仍可在本地无依赖启动；配置后会把请求审计写入
 * 一个启用 RLS 的追加表。业务接口的行为由契约服务提供，仓储边界保持独立，
 * 便于逐模块把内存状态迁移到 PostgreSQL。
 */
@Injectable()
export class RuntimePersistence implements OnModuleInit, OnModuleDestroy {
  private pool?: Pool;
  private ready = false;

  async onModuleInit() {
    if (!config.databaseUrl) return;
    this.pool = new Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 2_000, max: 5 });
    try {
      // 生产环境通常由迁移账号预先创建表，应用账号只需验证可访问性。
      await this.pool.query('SELECT 1 FROM runtime.request_event LIMIT 1');
      this.ready = true;
      return;
    } catch {
      // 开发环境若使用属主账号，则允许服务自初始化最小运行时表。
    }
    try {
      await this.pool.query(`
        CREATE SCHEMA IF NOT EXISTS runtime;
        CREATE TABLE IF NOT EXISTS runtime.request_event (
          id bigserial PRIMARY KEY,
          tenant_id text NOT NULL,
          method text NOT NULL,
          route text NOT NULL,
          status integer NOT NULL,
          purpose text,
          request_id text,
          actor_token_hash text,
          prev_hash text,
          hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        ALTER TABLE runtime.request_event ENABLE ROW LEVEL SECURITY;
        ALTER TABLE runtime.request_event FORCE ROW LEVEL SECURITY;
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'runtime' AND tablename = 'request_event' AND policyname = 'tenant_isolation'
          ) THEN
            CREATE POLICY tenant_isolation ON runtime.request_event
              USING (tenant_id = current_setting('app.tenant_id', true))
              WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
          END IF;
        END $$;
      `);
      this.ready = true;
    } catch {
      this.ready = false;
      await this.pool.end().catch(() => undefined);
      this.pool = undefined;
    }
  }

  async record(event: RuntimeEvent) {
    if (!this.ready || !this.pool) return;
    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", ['tenant-demo']);
      await client.query("SELECT pg_advisory_xact_lock(hashtext('runtime.request_event:tenant-demo'))");
      const previous = await client.query<{ hash: string }>(
        'SELECT hash FROM runtime.request_event WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1',
        ['tenant-demo'],
      );
      const prevHash = previous.rows[0]?.hash ?? null;
      const actorHash = event.token ? createHash('sha256').update(event.token).digest('hex') : null;
      const base = { tenant_id: 'tenant-demo', method: event.method, route: event.route, status: event.status, purpose: event.purpose ?? null, request_id: event.requestId ?? null, actor_token_hash: actorHash };
      const hash = createHash('sha256').update((prevHash ?? '') + JSON.stringify(base)).digest('hex');
      await client.query(
        `INSERT INTO runtime.request_event
          (tenant_id, method, route, status, purpose, request_id, actor_token_hash, prev_hash, hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [base.tenant_id, base.method, base.route, base.status, base.purpose, base.request_id, base.actor_token_hash, prevHash, hash],
      );
      await client.query('COMMIT');
    } catch {
      await client?.query('ROLLBACK').catch(() => undefined);
    } finally {
      client?.release();
    }
  }

  async recordCommand(command: DomainCommand) {
    if (!this.ready || !this.pool) return;
    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", ['tenant-demo']);
      const encrypted = this.encrypt(command);
      await client.query(
        `INSERT INTO runtime.domain_command
          (tenant_id, route_name, method, payload_enc, iv, auth_tag)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        ['tenant-demo', command.routeName, command.method, encrypted.ciphertext, encrypted.iv, encrypted.authTag],
      );
      await client.query('COMMIT');
    } catch {
      await client?.query('ROLLBACK').catch(() => undefined);
    } finally {
      client?.release();
    }
  }

  async loadCommands(): Promise<DomainCommand[]> {
    if (!this.ready || !this.pool) return [];
    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", ['tenant-demo']);
      const rows = await client.query<{ route_name: string; method: string; payload_enc: Buffer; iv: Buffer; auth_tag: Buffer }>(
        `SELECT route_name, method, payload_enc, iv, auth_tag
           FROM runtime.domain_command
          WHERE tenant_id = $1
          ORDER BY id ASC`,
        ['tenant-demo'],
      );
      await client.query('COMMIT');
      return rows.rows.map((row) => this.decrypt(row.payload_enc, row.iv, row.auth_tag) as DomainCommand);
    } catch {
      await client?.query('ROLLBACK').catch(() => undefined);
      return [];
    } finally {
      client?.release();
    }
  }

  private encryptionKey() {
    return createHash('sha256').update(config.dataEncryptionKey).digest();
  }

  private encrypt(value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return { ciphertext, iv, authTag: cipher.getAuthTag() };
  }

  private decrypt(ciphertext: Buffer, iv: Buffer, authTag: Buffer) {
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(), iv);
    decipher.setAuthTag(authTag);
    return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as unknown;
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
