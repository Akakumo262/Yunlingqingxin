import { Kysely, PostgresDialect, Transaction, sql } from 'kysely';
import { Pool } from 'pg';

/** 填肉时用 kysely-codegen 生成 Database 类型替换 any */
export type Db = Kysely<any>;

export function createDb(url: string): Db {
  return new Kysely<any>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: url, max: 10 }) }) });
}

export interface TenantCtx {
  tenantId: string;
  userId?: string;
  studentId?: string;
}

/**
 * 所有业务查询必须走这个函数：在事务内 set_config(..., true) 等价于 SET LOCAL，
 * 事务结束自动失效，避免连接复用导致租户串号（《技术路径》4.5）。
 * 应用连接账号必须是非属主的 yunling_app，否则 RLS 不生效。
 */
export function withTenant<T>(db: Db, ctx: TenantCtx, fn: (trx: Transaction<any>) => Promise<T>): Promise<T> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`.execute(trx);
    if (ctx.userId) await sql`select set_config('app.user_id', ${ctx.userId}, true)`.execute(trx);
    if (ctx.studentId) await sql`select set_config('app.student_id', ${ctx.studentId}, true)`.execute(trx);
    return fn(trx);
  });
}
