import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
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
      const previous = await client.query<{ hash: string }>(
        'SELECT hash FROM runtime.request_event WHERE tenant_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE',
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

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
