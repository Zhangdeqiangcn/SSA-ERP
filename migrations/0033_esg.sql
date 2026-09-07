-- V2.80.0 W1：ESG 报告迁真实 D1（根治双通道）
-- 与前端 useEsgStore（entityRepo 资源 esgReport）同源。
CREATE TABLE IF NOT EXISTS esg_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  report_no TEXT,
  period TEXT,
  category TEXT,
  indicator TEXT,
  value REAL DEFAULT 0,
  unit TEXT,
  target REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  remark TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_esg_reports_org ON esg_reports(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0033_esg', datetime('now'))
ON CONFLICT(version) DO NOTHING;
