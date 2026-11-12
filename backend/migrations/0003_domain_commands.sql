-- Encrypted event-sourced business commands. Replaying these commands restores
-- the contract runtime after a process restart without storing sensitive text in plaintext.

CREATE SCHEMA IF NOT EXISTS runtime;

CREATE TABLE IF NOT EXISTS runtime.domain_command (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  route_name text NOT NULL,
  method text NOT NULL,
  payload_enc bytea NOT NULL,
  iv bytea NOT NULL,
  auth_tag bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE runtime.domain_command ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime.domain_command FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='runtime' AND tablename='domain_command' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON runtime.domain_command
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END $$;

GRANT SELECT, INSERT ON runtime.domain_command TO yunling_app;
GRANT USAGE, SELECT ON SEQUENCE runtime.domain_command_id_seq TO yunling_app;
