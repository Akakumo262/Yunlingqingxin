-- 内容发现来源元数据。该迁移独立于 0001 草案，可在兼容运行期数据库中执行。
-- 内容正文仍由 cnt.content_item 管理；此表使用契约中的字符串 id，
-- 便于先与现有 mock/导入数据联调，再逐步迁移到 UUID 内容主表。
CREATE SCHEMA IF NOT EXISTS cnt;
CREATE SCHEMA IF NOT EXISTS cnt;
CREATE TABLE IF NOT EXISTS cnt.content_source (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  canonical_url text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('official_site','official_account','rss','manual')),
  trust_tier text NOT NULL DEFAULT 'review_required' CHECK (trust_tier IN ('official','review_required')),
  terms_url text,
  robots_checked_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canonical_url)
);

CREATE TABLE IF NOT EXISTS cnt.content_discovery (
  content_id text PRIMARY KEY,
  source_id uuid NOT NULL REFERENCES cnt.content_source(id),
  external_url text NOT NULL,
  source_verified boolean NOT NULL DEFAULT false,
  discover_kind text NOT NULL CHECK (discover_kind IN ('ai_insight','competition','volunteer','policy','career','activity','other')),
  audience_stages text[] NOT NULL DEFAULT '{}',
  deadline timestamptz,
  location text,
  content_hash text,
  last_verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_url)
);

CREATE INDEX IF NOT EXISTS ix_content_discovery_kind
  ON cnt.content_discovery (discover_kind, source_verified, deadline);
CREATE INDEX IF NOT EXISTS ix_content_discovery_source
  ON cnt.content_discovery (source_id, source_verified);

COMMENT ON TABLE cnt.content_source IS '可追溯内容来源；只有人工审核后才允许作为已验证来源';
COMMENT ON TABLE cnt.content_discovery IS '学生发现流的外部资源与受众元数据，不存抓取正文';

GRANT USAGE ON SCHEMA cnt TO yunling_app;
GRANT SELECT ON cnt.content_source, cnt.content_discovery TO yunling_app;

GRANT USAGE ON SCHEMA cnt TO yunling_app;
GRANT SELECT ON cnt.content_source, cnt.content_discovery TO yunling_app;
