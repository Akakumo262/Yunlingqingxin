require('./load-env.cjs');
const { Pool } = require('pg');
const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('缺少 MIGRATE_DATABASE_URL');
const pool = new Pool({ connectionString: url });
(async () => {
  try {
    await pool.query('TRUNCATE TABLE app_runtime.events, app_runtime.refresh_tokens, app_runtime.check_ins RESTART IDENTITY');
    console.log('运行期事件、刷新令牌与打卡记录已清空');
  } finally {
    await pool.end();
  }
})().catch((error) => { console.error(error.message); process.exit(1); });
