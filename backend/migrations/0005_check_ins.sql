CREATE TABLE IF NOT EXISTS app_runtime.check_ins (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account TEXT NOT NULL,
  student_id TEXT NOT NULL,
  client_id TEXT,
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'okay', 'low', 'hard')),
  note_ciphertext TEXT,
  note_iv TEXT,
  note_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS check_ins_tenant_student_client_idx
  ON app_runtime.check_ins (tenant_id, student_id, client_id)
  WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS check_ins_tenant_student_created_idx
  ON app_runtime.check_ins (tenant_id, student_id, created_at DESC);

ALTER TABLE app_runtime.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_runtime.check_ins FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY tenant_check_ins ON app_runtime.check_ins
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT ON app_runtime.check_ins TO yunling_app;

-- 兼容本地曾按早期草案创建的明文 note 列：新写入一律走加密三元组。
ALTER TABLE app_runtime.check_ins ADD COLUMN IF NOT EXISTS note_ciphertext TEXT;
ALTER TABLE app_runtime.check_ins ADD COLUMN IF NOT EXISTS note_iv TEXT;
ALTER TABLE app_runtime.check_ins ADD COLUMN IF NOT EXISTS note_tag TEXT;
ALTER TABLE app_runtime.check_ins DROP COLUMN IF EXISTS note;
