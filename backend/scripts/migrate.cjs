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

const databaseUrl = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('缺少 MIGRATE_DATABASE_URL 或 DATABASE_URL');
  process.exit(1);
}

const migrationsDir = path.resolve(__dirname, '..', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter((name) => /^\d+_.*\.sql$/i.test(name))
  .sort();

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS runtime');
    await client.query(`
      CREATE TABLE IF NOT EXISTS runtime.schema_migration (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    for (const name of files) {
      const exists = await client.query('SELECT 1 FROM runtime.schema_migration WHERE name = $1', [name]);
      if (exists.rowCount) continue;
      const raw = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
      const up = raw.split(/^--\s*Down Migration\s*$/im, 1)[0].trim();
      await client.query('BEGIN');
      try {
        await client.query(up);
        await client.query('INSERT INTO runtime.schema_migration (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.log(`迁移完成: ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
