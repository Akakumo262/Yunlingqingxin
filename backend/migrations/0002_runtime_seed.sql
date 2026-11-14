-- Contract-facing runtime tables. IDs remain opaque text so demo IDs (s1, c1, in1 …)
-- are preserved exactly when this seed is loaded into PostgreSQL.

CREATE SCHEMA IF NOT EXISTS runtime;

CREATE TABLE IF NOT EXISTS runtime.demo_user (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  account text NOT NULL UNIQUE,
  roles text[] NOT NULL,
  purposes text[] NOT NULL,
  activated boolean NOT NULL DEFAULT true,
  profile jsonb NOT NULL DEFAULT '{}'
);

INSERT INTO runtime.demo_user (id, tenant_id, account, roles, purposes, activated) VALUES
  ('s1','tenant-demo','student01',ARRAY['student'],ARRAY['PUR-01','PUR-02'],true),
  ('s2','tenant-demo','student02',ARRAY['student'],ARRAY['PUR-01','PUR-02'],false),
  ('s13','tenant-demo','student03',ARRAY['student'],ARRAY['PUR-01','PUR-02'],true),
  ('g1','tenant-demo','parent01',ARRAY['guardian'],ARRAY['PUR-01'],true),
  ('g2','tenant-demo','parent02',ARRAY['guardian'],ARRAY['PUR-01'],false),
  ('t1','tenant-demo','teacher01',ARRAY['head_teacher'],ARRAY['PUR-01','PUR-02'],true),
  ('t2','tenant-demo','psy01',ARRAY['psychologist'],ARRAY['PUR-01','PUR-02'],true),
  ('t3','tenant-demo','leader01',ARRAY['school_leader'],ARRAY['PUR-02','PUR-03'],true),
  ('t4','tenant-demo','schooladmin01',ARRAY['school_admin'],ARRAY['PUR-01'],true),
  ('e1','tenant-demo','edu01',ARRAY['edu_admin'],ARRAY['PUR-03'],true),
  ('m1','tenant-demo','cmt01',ARRAY['committee'],ARRAY['PUR-01'],true),
  ('i1','tenant-demo','inst01',ARRAY['institution'],ARRAY['PUR-02'],true),
  ('o1','tenant-demo','ops01',ARRAY['operator'],ARRAY['PUR-01'],true),
  ('a1','tenant-demo','audit01',ARRAY['auditor'],ARRAY['PUR-05'],true)
ON CONFLICT (account) DO NOTHING;

CREATE TABLE IF NOT EXISTS runtime.request_event (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  method text NOT NULL,
  route text NOT NULL,
  status integer NOT NULL,
  purpose text,
  request_id text,
  actor_token_hash text,
  prev_hash text,
  hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE runtime.demo_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime.demo_user FORCE ROW LEVEL SECURITY;
ALTER TABLE runtime.request_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime.request_event FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='runtime' AND tablename='demo_user' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON runtime.demo_user
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='runtime' AND tablename='request_event' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON runtime.request_event
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END $$;

GRANT USAGE ON SCHEMA runtime TO yunling_app;
GRANT SELECT ON runtime.demo_user TO yunling_app;
GRANT SELECT, INSERT ON runtime.request_event TO yunling_app;
GRANT USAGE, SELECT ON SEQUENCE runtime.request_event_id_seq TO yunling_app;
