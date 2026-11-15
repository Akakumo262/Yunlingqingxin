const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('缺少 MIGRATE_DATABASE_URL（建议使用数据库属主账号执行迁移）');
  process.exit(1);
}

const files = ['0002_runtime_events.sql', '0003_runtime_event_purpose.sql', '0004_refresh_tokens.sql'];
const sql = files.map((file) => fs.readFileSync(path.join(__dirname, '..', 'migrations', file), 'utf8')).join('\n');
const pool = new Pool({ connectionString: url });

(async () => {
  try {
    await pool.query(sql);
    console.log('数据库迁移完成：app_runtime.events');
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error('数据库迁移失败：', error.message);
  process.exit(1);
});
