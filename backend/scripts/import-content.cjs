const crypto = require('node:crypto');
const { Pool } = require('pg');

const MAX_BYTES = 2 * 1024 * 1024;
const USER_AGENT = 'YunlingQingxinContentImporter/0.1 (+content-review)';
const KINDS = new Set(['ai_insight', 'competition', 'volunteer', 'policy', 'career', 'activity', 'other']);

function usage() {
  console.log(`用法：
  npm.cmd run import:content -w @yunling/backend -- --url <官方网址> --kind <分类> --content-id <内容ID> [选项]

必填：
  --url          要导入的公开文章/资源地址
  --kind         ai_insight|competition|volunteer|policy|career|activity|other
  --content-id   对应内容卡片 ID（例如 ct-news-001）

可选：
  --audience     面向学段，逗号分隔，例如 大学生,高中生
  --deadline     截止时间，ISO-8601
  --location     地点
  --title        人工填写的标题（写入 metadata，不替代正文审核）
  --summary      人工填写的摘要（写入 metadata）
  --metadata     额外 JSON 元数据
  --dry-run       只抓取、校验并输出结果，不写入数据库
  --help          显示帮助

安全边界：仅允许 cnt.content_source 中 active=true 的来源；robots.txt 获取失败时拒绝抓取；
不绕过 robots、不自动标记 source_verified=true。审核通过后需由人工更新 source_verified。`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { usage(); process.exit(0); }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'dryRun') { out.dryRun = true; continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`参数 --${key} 需要值`);
    out[key] = value;
  }
  return out;
}

function normalizeUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只允许 http/https 地址');
  url.hash = '';
  return url;
}

function hostAllowed(target, canonical) {
  const t = target.hostname.toLowerCase();
  const c = canonical.hostname.toLowerCase();
  return t === c || t.endsWith(`.${c}`);
}

function parseRobots(text) {
  const groups = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#', 1)[0].trim();
    if (!line) continue;
    const [keyRaw, valueRaw = ''] = line.split(':', 2);
    const key = keyRaw.trim().toLowerCase();
    const value = valueRaw.trim();
    if (key === 'user-agent') {
      current = { agents: [value.toLowerCase()], disallow: [] };
      groups.push(current);
    } else if (key === 'disallow' && current && value) {
      current.disallow.push(value);
    }
  }
  const relevant = groups.filter((g) => g.agents.includes('*') || g.agents.some((a) => USER_AGENT.toLowerCase().includes(a)));
  return relevant.flatMap((g) => g.disallow);
}

function robotsMatch(pathname, rule) {
  if (!rule) return false;
  const normalized = rule.startsWith('/') ? rule : `/${rule}`;
  if (normalized.endsWith('$')) return pathname === normalized.slice(0, -1);
  return pathname.startsWith(normalized);
}

async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,text/plain,*/*;q=0.8' },
    });
    if (!response.ok) throw new Error(`${url} 返回 HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) throw new Error(`${url} 超过 ${MAX_BYTES} 字节上限`);
    return { response, text: buffer.toString('utf8') };
  } finally {
    clearTimeout(timer);
  }
}

async function checkRobots(target) {
  const robotsUrl = new URL('/robots.txt', target.origin).toString();
  let response;
  try {
    response = await fetch(robotsUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': USER_AGENT, accept: 'text/plain,*/*;q=0.2' },
    });
  } catch (error) {
    throw new Error(`robots.txt 无法获取，已拒绝抓取：${error.message}`);
  }
  if (response.status === 404) return { checkedAt: new Date().toISOString(), allowed: true, status: 404 };
  if (!response.ok) throw new Error(`robots.txt 返回 HTTP ${response.status}，已拒绝抓取`);
  const rules = parseRobots(await response.text());
  const allowed = !rules.some((rule) => robotsMatch(target.pathname, rule));
  if (!allowed) throw new Error(`robots.txt 禁止抓取 ${target.pathname}`);
  return { checkedAt: new Date().toISOString(), allowed: true, status: response.status };
}

function parseMetadata(value) {
  if (!value) return {};
  let parsed;
  try { parsed = JSON.parse(value); } catch (error) { throw new Error(`--metadata 不是合法 JSON：${error.message}`); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('--metadata 必须是 JSON 对象');
  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url || !args.kind || !args.contentId) throw new Error('必须提供 --url、--kind、--content-id（使用 --help 查看）');
  if (!KINDS.has(args.kind)) throw new Error(`未知 --kind：${args.kind}`);
  const target = normalizeUrl(args.url);
  const metadata = { ...parseMetadata(args.metadata), title: args.title, summary: args.summary, imported_by: 'manual-http', importer_version: '0.1' };
  if (metadata.title === undefined) delete metadata.title;
  if (metadata.summary === undefined) delete metadata.summary;
  const audienceStages = String(args.audience ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (args.deadline && Number.isNaN(Date.parse(args.deadline))) throw new Error('--deadline 不是合法日期');

  const connectionString = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('缺少 MIGRATE_DATABASE_URL 或 DATABASE_URL');
  const pool = new Pool({ connectionString });
  try {
    const sourceQuery = await pool.query(`SELECT id, canonical_url, trust_tier FROM cnt.content_source WHERE active = true`);
    const source = sourceQuery.rows.find((row) => hostAllowed(target, normalizeUrl(row.canonical_url)));
    if (!source) throw new Error('地址不在 active 内容来源白名单内，请先运行 seed:content 或登记来源');
    const canonical = normalizeUrl(source.canonical_url);
    const robots = await checkRobots(target);
    const fetched = await fetchText(target);
    const finalUrl = normalizeUrl(fetched.response.url || target.toString());
    if (!hostAllowed(finalUrl, canonical)) throw new Error('抓取发生跨域跳转，已拒绝写入');
    const contentHash = crypto.createHash('sha256').update(fetched.text, 'utf8').digest('hex');
    const result = {
      content_id: args.contentId,
      source_id: source.id,
      external_url: finalUrl.toString(),
      source_verified: false,
      discover_kind: args.kind,
      audience_stages: audienceStages,
      deadline: args.deadline ? new Date(args.deadline).toISOString() : null,
      location: args.location ?? null,
      content_hash: contentHash,
      robots_checked_at: robots.checkedAt,
      fetched_bytes: Buffer.byteLength(fetched.text, 'utf8'),
      metadata,
    };
    if (args.dryRun) { console.log(JSON.stringify(result, null, 2)); return; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE cnt.content_source SET robots_checked_at = now() WHERE id = $1`, [source.id]);
      const duplicate = await client.query(`SELECT content_id, external_url FROM cnt.content_discovery WHERE content_hash = $1 OR external_url = $2 LIMIT 1`, [contentHash, finalUrl.toString()]);
      if (duplicate.rowCount) {
        await client.query('ROLLBACK');
        console.log(JSON.stringify({ duplicate: duplicate.rows[0], content_hash: contentHash }, null, 2));
        return;
      }
      await client.query(`
        INSERT INTO cnt.content_discovery
          (content_id, source_id, external_url, source_verified, discover_kind, audience_stages, deadline, location, content_hash, last_verified_at, metadata)
        VALUES ($1, $2, $3, false, $4, $5::text[], $6, $7, $8, NULL, $9::jsonb)
      `, [args.contentId, source.id, finalUrl.toString(), args.kind, audienceStages, result.deadline, result.location, contentHash, JSON.stringify(metadata)]);
      await client.query('COMMIT');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') throw new Error('内容 URL 或 content_hash 已存在，已拒绝重复写入');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool?.end();
  }
}

main().catch((error) => { console.error(`内容导入失败：${error.message}`); process.exit(1); });
