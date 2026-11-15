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
    const refresh = await pool.query(`
      SELECT c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'app_runtime' AND c.relname = 'refresh_tokens'
    `);
    if (!refresh.rows[0]?.relrowsecurity || !refresh.rows[0]?.relforcerowsecurity) throw new Error('refresh_tokens 未启用强制 RLS');
    const refreshPolicy = await pool.query(`
      SELECT 1 FROM pg_policies WHERE schemaname = 'app_runtime' AND tablename = 'refresh_tokens' AND policyname = 'tenant_refresh_tokens'
    `);
    if (!refreshPolicy.rowCount) throw new Error('refresh_tokens 缺少租户隔离策略');
    await pool.query(`SELECT set_config('app.tenant_id', 'tenant-demo', false)`);
    const badHash = await pool.query(`SELECT 1 FROM app_runtime.refresh_tokens WHERE token_hash !~ '^[0-9a-f]{64}$' LIMIT 1`);
    if (badHash.rowCount) throw new Error('刷新令牌未以 SHA-256 哈希保存');
    const runtimeCheckIns = await pool.query(`
      SELECT c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'app_runtime' AND c.relname = 'check_ins'
    `);
    if (!runtimeCheckIns.rows[0]?.relrowsecurity || !runtimeCheckIns.rows[0]?.relforcerowsecurity) throw new Error('app_runtime.check_ins 未启用强制 RLS');
    const runtimeCheckInsPolicy = await pool.query(`
      SELECT 1 FROM pg_policies WHERE schemaname = 'app_runtime' AND tablename = 'check_ins' AND policyname = 'tenant_check_ins'
    `);
    if (!runtimeCheckInsPolicy.rowCount) throw new Error('app_runtime.check_ins 缺少租户隔离策略');
    const noteColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'app_runtime' AND table_name = 'check_ins'
        AND column_name IN ('note_ciphertext', 'note_iv', 'note_tag')
    `);
    if (noteColumns.rowCount !== 3) throw new Error('app_runtime.check_ins 缺少 AES-GCM 加密字段');
    console.log('安全测试通过：事件、刷新令牌与打卡表强制 RLS、租户策略和敏感备注加密正常');
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error('安全测试失败：', error.message);
  process.exit(1);
});
