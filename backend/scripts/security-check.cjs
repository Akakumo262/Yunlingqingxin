const { Pool } = require('pg');

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('缺少数据库连接串');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
(async () => {
  try {
    const rls = await pool.query(`
      SELECT c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'app_runtime' AND c.relname = 'events'
    `);
    if (!rls.rows[0]?.relrowsecurity || !rls.rows[0]?.relforcerowsecurity) throw new Error('app_runtime.events 未启用强制 RLS');
    const policy = await pool.query(`
      SELECT 1 FROM pg_policies WHERE schemaname = 'app_runtime' AND tablename = 'events' AND policyname = 'tenant_events'
    `);
    if (!policy.rowCount) throw new Error('缺少租户隔离策略');
    console.log('安全测试通过：事件表强制 RLS 与租户策略正常');
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error('安全测试失败：', error.message);
  process.exit(1);
});
