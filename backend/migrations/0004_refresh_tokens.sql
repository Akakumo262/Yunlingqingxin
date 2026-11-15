CREATE TABLE IF NOT EXISTS app_runtime.refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_account_idx ON app_runtime.refresh_tokens (tenant_id, account, created_at DESC);
ALTER TABLE app_runtime.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_runtime.refresh_tokens FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY tenant_refresh_tokens ON app_runtime.refresh_tokens
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE ON app_runtime.refresh_tokens TO yunling_app;
GRANT USAGE, SELECT ON SEQUENCE app_runtime.refresh_tokens_id_seq TO yunling_app;
