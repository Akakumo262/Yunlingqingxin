const { Pool } = require('pg');

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('缺少 MIGRATE_DATABASE_URL 或 DATABASE_URL');
  process.exit(1);
}

const sources = [
  { name: '中国政府网', url: 'https://www.gov.cn/', kind: 'official_site', terms: 'https://www.gov.cn/fuwu/' },
  { name: '教育部', url: 'https://www.moe.gov.cn/', kind: 'official_site', terms: 'https://www.moe.gov.cn/jyb_xxgk/xxgk/' },
  { name: '共青团中央', url: 'https://www.gqt.org.cn/', kind: 'official_site', terms: 'https://www.gqt.org.cn/xxgk/' },
];

const pool = new Pool({ connectionString: url });
(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const source of sources) {
      await client.query(
        `INSERT INTO cnt.content_source (name, canonical_url, source_kind, trust_tier, terms_url)
         VALUES ($1, $2, $3, 'official', $4)
         ON CONFLICT (canonical_url) DO UPDATE SET name = EXCLUDED.name, terms_url = EXCLUDED.terms_url, active = true`,
        [source.name, source.url, source.kind, source.terms],
      );
    }
    await client.query('COMMIT');
    console.log(`内容来源种子完成：${sources.length} 个官方来源`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('内容来源种子失败：', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((error) => {
  console.error('内容来源种子失败：', error.message);
  process.exit(1);
});
