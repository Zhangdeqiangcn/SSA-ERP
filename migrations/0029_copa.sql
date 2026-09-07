-- V2.80.0 W1：COPA 获利分析迁真实 D1（根治双通道）
-- 与前端 useCopaStore（entityRepo 资源 copa）同源。
CREATE TABLE IF NOT EXISTS copa_analysis (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  dimension TEXT,
  key TEXT,
  label TEXT,
  period TEXT,
  revenue REAL DEFAULT 0,
  cogs REAL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_copa_analysis_org ON copa_analysis(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0029_copa', datetime('now'))
ON CONFLICT(version) DO NOTHING;
