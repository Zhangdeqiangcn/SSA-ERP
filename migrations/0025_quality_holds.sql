-- W2 收尾：质检扣留 quality_holds
-- 根治双通道：warehouseAdvancedStore.qualityHolds 切片由 app_state Blob 迁真实 D1。
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS quality_holds (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  batch_no TEXT,
  quantity REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  source_inbound_no TEXT,
  hold_date TEXT,
  release_date TEXT,
  inspector TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_quality_hold_org ON quality_holds(org_id);
CREATE INDEX IF NOT EXISTS idx_quality_hold_status ON quality_holds(org_id, status);

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0025_quality_holds', datetime('now'))
ON CONFLICT(version) DO NOTHING;
