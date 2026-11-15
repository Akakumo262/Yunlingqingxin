CREATE SCHEMA IF NOT EXISTS app_runtime;

CREATE TABLE IF NOT EXISTS app_runtime.events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account TEXT NOT NULL,
  route_name TEXT NOT NULL,
  purpose TEXT,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  query JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_ciphertext TEXT NOT NULL,
  payload_iv TEXT NOT NULL,
  payload_tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_tenant_id_id_idx ON app_runtime.events (tenant_id, id);
ALTER TABLE app_runtime.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_runtime.events FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY tenant_events ON app_runtime.events
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA app_runtime TO yunling_app;
GRANT SELECT, INSERT ON app_runtime.events TO yunling_app;
GRANT USAGE, SELECT ON SEQUENCE app_runtime.events_id_seq TO yunling_app;
