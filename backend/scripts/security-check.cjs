const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const envCandidates = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(__dirname, '..', '.env.local'),
  path.resolve(__dirname, '..', '..', '.env.local'),
];
const localEnv = envCandidates.find((candidate) => fs.existsSync(candidate));
if (localEnv) process.loadEnvFile(localEnv);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('缺少 DATABASE_URL');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id', 'tenant-demo', false)");
    const visible = await client.query('SELECT count(*)::int AS count FROM runtime.demo_user');
    if (visible.rows[0].count < 10) throw new Error('tenant-demo 看不到种子账号');

    await client.query("SELECT set_config('app.tenant_id', 'other-tenant', false)");
    const hidden = await client.query('SELECT count(*)::int AS count FROM runtime.demo_user');
    if (hidden.rows[0].count !== 0) throw new Error('RLS 未隔离其他租户数据');

    const rls = await client.query(`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'runtime' AND c.relname IN ('demo_user','request_event','domain_command')
    `);
    if (rls.rows.length !== 3 || rls.rows.some((r) => !r.relrowsecurity || !r.relforcerowsecurity)) {
      throw new Error('runtime 表未全部启用强制 RLS');
    }

    let blocked = false;
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', 'other-tenant', true)");
      await client.query(`INSERT INTO runtime.request_event (tenant_id, method, route, status, hash)
                          VALUES ('tenant-demo', 'GET', '/security-check', 200, 'blocked')`);
      await client.query('ROLLBACK');
    } catch {
      blocked = true;
      await client.query('ROLLBACK').catch(() => undefined);
    }
    if (!blocked) throw new Error('RLS 未阻止跨租户写入');

    await client.query("SELECT set_config('app.tenant_id', 'tenant-demo', false)");
    const encrypted = await client.query(`
      SELECT count(*)::int AS count, min(octet_length(payload_enc))::int AS min_bytes
        FROM runtime.domain_command
    `);
    if (encrypted.rows[0].count > 0 && encrypted.rows[0].min_bytes < 16) throw new Error('加密命令密文长度异常');
    console.log('安全测试通过：RLS 隔离、跨租户写入拒绝、加密命令存储均正常');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
