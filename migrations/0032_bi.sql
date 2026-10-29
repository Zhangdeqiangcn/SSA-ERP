-- V2.80.0 W1：BI 集成迁真实 D1（根治双通道）
-- 与前端 useBiStore（entityRepo 资源 biIntegration）同源。
CREATE TABLE IF NOT EXISTS bi_integrations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  conn_no TEXT,
  conn_name TEXT,
  platform TEXT,
  endpoint TEXT,
  dataset TEXT,
  status TEXT DEFAULT 'inactive',
  last_sync_at TEXT,
  remark TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_bi_integrations_org ON bi_integrations(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0032_bi', datetime('now'))
ON CONFLICT(version) DO NOTHING;
