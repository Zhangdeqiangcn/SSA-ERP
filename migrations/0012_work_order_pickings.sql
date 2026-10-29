-- B2 三岛：工单领料
PRAGMA foreign_keys = ON;

-- 1. 工单领料主表
CREATE TABLE IF NOT EXISTS work_order_pickings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  work_order_id TEXT NOT NULL,
  work_order_no TEXT,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  unit TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  outbound_no TEXT,
  issued_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, work_order_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_wop_org_wo ON work_order_pickings(org_id, work_order_id);

-- 2. 版本控制
INSERT INTO schema_migrations (version, applied_at) VALUES ('0012_work_order_pickings', datetime('now')) ON CONFLICT(version) DO NOTHING;
