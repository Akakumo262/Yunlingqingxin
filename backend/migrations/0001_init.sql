-- Up Migration
-- G0 核心表。约定见《技术路径》6.2：uuid 主键、timestamptz、tenant_id NOT NULL、枚举用 CHECK、
-- 敏感文本存 *_enc bytea（应用层信封加密）。枚举取值与 contracts/src/enums.ts 保持一致。
-- 本机无 PostgreSQL，此文件尚未实跑，首次执行如报错请就地修正。

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA iam; CREATE SCHEMA org; CREATE SCHEMA asm; CREATE SCHEMA rsk;
CREATE SCHEMA col; CREATE SCHEMA cnt; CREATE SCHEMA com; CREATE SCHEMA ai; CREATE SCHEMA aud;

-- ── iam ──
CREATE TABLE iam.tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('platform','committee','education','school','institution')),
  name text NOT NULL,
  parent_id uuid REFERENCES iam.tenant(id),
  status text NOT NULL DEFAULT 'active',
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE iam.app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  account text,
  password_hash text,              -- Argon2id
  wechat_openid text,
  name_enc bytea, phone_enc bytea, phone_hash text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX ux_user_account ON iam.app_user (tenant_id, account) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ux_user_openid ON iam.app_user (wechat_openid) WHERE deleted_at IS NULL;
CREATE TABLE iam.user_role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  user_id uuid NOT NULL REFERENCES iam.app_user(id),
  role text NOT NULL,              -- contracts Role
  org_id uuid,                     -- 数据域锚点：班/校/辖区
  valid_from timestamptz NOT NULL DEFAULT now(), valid_to timestamptz
);
CREATE INDEX ix_user_role ON iam.user_role (user_id, org_id);
CREATE TABLE iam.consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  subject_id uuid NOT NULL,        -- 学生
  granted_by uuid NOT NULL,        -- 学生本人或监护人
  purpose text NOT NULL,           -- service/assessment/referral/ai/community/research
  version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz
);
CREATE INDEX ix_consent ON iam.consent (subject_id, purpose);

-- ── org ──
CREATE TABLE org.org_unit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  type text NOT NULL CHECK (type IN ('bureau','school','grade','class')),
  parent_id uuid REFERENCES org.org_unit(id),
  name text NOT NULL, code text
);
CREATE INDEX ix_org_parent ON org.org_unit (tenant_id, parent_id);
CREATE TABLE org.student (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  user_id uuid REFERENCES iam.app_user(id),      -- 激活后绑定
  school_id uuid NOT NULL REFERENCES org.org_unit(id),
  class_id uuid REFERENCES org.org_unit(id),
  name_enc bytea NOT NULL, name_hash text NOT NULL,
  sno_token text NOT NULL,                        -- 学籍号 HMAC，不可逆
  birth_year int,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','graduated','transferred','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE UNIQUE INDEX ux_student_sno ON org.student (tenant_id, sno_token) WHERE deleted_at IS NULL;
CREATE INDEX ix_student_class ON org.student (tenant_id, class_id) WHERE deleted_at IS NULL;
CREATE TABLE org.guardian_relation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  student_id uuid NOT NULL REFERENCES org.student(id),
  guardian_id uuid NOT NULL REFERENCES iam.app_user(id),
  relation text NOT NULL, verified boolean NOT NULL DEFAULT false
);

-- ── 日常与测评 ──
CREATE TABLE asm.check_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  student_id uuid NOT NULL REFERENCES org.student(id),
  mood text NOT NULL CHECK (mood IN ('great','good','okay','low','hard')),
  note_enc bytea,
  client_id uuid, client_ts timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_check_in ON asm.check_in (tenant_id, student_id, created_at DESC);
CREATE UNIQUE INDEX ux_check_in_client ON asm.check_in (student_id, client_id) WHERE client_id IS NOT NULL;
CREATE TABLE asm.instrument (          -- 平台级，无 tenant_id
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('screening','development','career','entertainment')),
  age_min int, age_max int, license text NOT NULL,
  items jsonb NOT NULL, scoring jsonb NOT NULL, disclaimer text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
);
CREATE TABLE asm.assessment_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  student_id uuid NOT NULL REFERENCES org.student(id),
  instrument_id uuid NOT NULL REFERENCES asm.instrument(id),
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','submitted','abandoned')),
  answers_enc bytea, score_enc bytea,
  created_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz
);
CREATE INDEX ix_asm_session ON asm.assessment_session (tenant_id, student_id, created_at DESC);

-- ── 风险与个案 ──
CREATE TABLE rsk.observation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  student_id uuid NOT NULL REFERENCES org.student(id),
  teacher_id uuid NOT NULL REFERENCES iam.app_user(id),
  scene text NOT NULL, dimensions text[] NOT NULL, note_enc bytea NOT NULL, next_step text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE rsk.risk_signal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  student_id uuid NOT NULL REFERENCES org.student(id),
  source text NOT NULL, rule_code text, level_hint text NOT NULL CHECK (level_hint IN ('L0','L1','L2','L3')),
  message_enc bytea, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE rsk.alert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  signal_id uuid NOT NULL REFERENCES rsk.risk_signal(id),
  student_id uuid NOT NULL REFERENCES org.student(id),
  level text NOT NULL CHECK (level IN ('L0','L1','L2','L3')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acked','escalated','converted','dismissed')),
  reason text NOT NULL, assignee_id uuid, due_at timestamptz NOT NULL,
  acked_by uuid, acked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_alert ON rsk.alert (tenant_id, status, due_at);
CREATE TABLE rsk.case_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  case_no text NOT NULL, student_id uuid NOT NULL REFERENCES org.student(id),
  level text NOT NULL CHECK (level IN ('L1','L2','L3')),
  status text NOT NULL DEFAULT 'pending_confirm' CHECK (status IN ('pending_confirm','following','referred','closed','dismissed')),
  owner_id uuid NOT NULL REFERENCES iam.app_user(id),
  plan jsonb,                      -- 支持计划：目标/责任人/频次/复盘时间（BR-21）
  close_summary_enc bytea, version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_case_no ON rsk.case_record (tenant_id, case_no);
CREATE TABLE rsk.intervention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  case_id uuid NOT NULL REFERENCES rsk.case_record(id),
  actor_id uuid NOT NULL, type text NOT NULL, note_enc bytea NOT NULL, outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE col.institution (         -- 平台级
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, name text NOT NULL, intro text, services jsonb NOT NULL DEFAULT '[]',
  license_object_key text, contact_enc bytea,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','approved','rejected','offline')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE col.referral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  case_id uuid NOT NULL REFERENCES rsk.case_record(id),
  to_institution_id uuid NOT NULL REFERENCES col.institution(id),
  package_enc bytea NOT NULL, package_hash text NOT NULL,   -- 最小必要转介包快照
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','accepted','rejected','feedback_received','closed','revoked')),
  feedback_enc bytea, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── 内容（平台级，公开数据） ──
CREATE TABLE cnt.content_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL, type text NOT NULL CHECK (type IN ('article','video','audio')),
  title text NOT NULL, summary text NOT NULL DEFAULT '', body text,
  asset_object_key text, cover_object_key text, duration int,
  age_min int, age_max int,
  source text NOT NULL, author text NOT NULL, license text NOT NULL,   -- BR-34 缺一不可
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ai_pending','ai_passed','ai_blocked','team_review','tri_party_review','published','rejected','offline')),
  embedding vector(1024),          -- RAG；维度随所选嵌入模型调整
  created_by uuid, published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_content_feed ON cnt.content_item (status, channel, published_at DESC);
CREATE TABLE cnt.content_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES cnt.content_item(id),
  stage text NOT NULL CHECK (stage IN ('ai','team','tri_party')),
  reviewer_id uuid, result text NOT NULL CHECK (result IN ('pass','reject','conditional')), reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cnt.career_card (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('industry','job','major','person')),
  title text NOT NULL, body jsonb NOT NULL, region text, source text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── 成长圈 ──
CREATE TABLE com.circle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  type text NOT NULL CHECK (type IN ('class','topic','activity')),
  name text NOT NULL, org_id uuid, owner_id uuid NOT NULL, status text NOT NULL DEFAULT 'active'
);
CREATE TABLE com.post (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  circle_id uuid NOT NULL REFERENCES com.circle(id),
  parent_id uuid REFERENCES com.post(id),        -- 非空即评论
  author_id uuid NOT NULL, nickname text NOT NULL,  -- 未成年人只展示昵称（CM-01）
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','published','rejected','removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_post ON com.post (tenant_id, circle_id, status, created_at DESC);
CREATE TABLE com.report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  post_id uuid NOT NULL REFERENCES com.post(id),
  reporter_id uuid NOT NULL, reason text NOT NULL,
  status text NOT NULL DEFAULT 'open', handled_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ── AI（会话 30 天，BR-41） ──
CREATE TABLE ai.session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  user_id uuid NOT NULL, status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE ai.message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES iam.tenant(id),
  session_id uuid NOT NULL REFERENCES ai.session(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content_enc bytea NOT NULL, model text, prompt_version text, sources jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 审计（追加式，按月分区） ──
CREATE TABLE aud.audit_event (
  id uuid NOT NULL, tenant_id uuid NOT NULL,
  actor_id uuid, actor_role text, action text NOT NULL,
  resource_type text NOT NULL, resource_id text, purpose text,
  result text NOT NULL CHECK (result IN ('allow','deny','error')),
  ip inet, request_id text, detail jsonb,
  prev_hash text, hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE TABLE aud.audit_event_default PARTITION OF aud.audit_event DEFAULT;
CREATE INDEX ix_audit ON aud.audit_event (tenant_id, created_at DESC);
CREATE TABLE aud.outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL, event_type text NOT NULL, version int NOT NULL DEFAULT 1,
  payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE TABLE aud.idempotency_key (
  key text PRIMARY KEY, tenant_id uuid NOT NULL, response jsonb, created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 租户隔离：所有带 tenant_id 的表启用并强制 RLS ──
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.table_schema, c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.column_name = 'tenant_id' AND c.table_schema IN ('iam','org','asm','rsk','col','com','ai','aud')
      AND c.table_name <> 'audit_event_default'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.table_schema, t.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', t.table_schema, t.table_name);
    EXECUTE format($p$CREATE POLICY p_tenant ON %I.%I USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)$p$, t.table_schema, t.table_name);
  END LOOP;
END $$;

-- 应用账号权限：审计表只允许追加
GRANT USAGE ON SCHEMA iam, org, asm, rsk, col, cnt, com, ai, aud TO yunling_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA iam, org, asm, rsk, col, cnt, com, ai TO yunling_app;
GRANT SELECT, INSERT ON aud.audit_event, aud.audit_event_default TO yunling_app;
GRANT SELECT, INSERT, UPDATE ON aud.outbox, aud.idempotency_key TO yunling_app;

-- Down Migration
DROP SCHEMA IF EXISTS aud, ai, com, cnt, col, rsk, asm, org, iam CASCADE;
