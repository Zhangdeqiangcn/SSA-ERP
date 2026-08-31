-- B2 三岛：委外订单 + 委外发料明细
PRAGMA foreign_keys = ON;

-- 1. 委外订单主表
CREATE TABLE IF NOT EXISTS subcontract_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  type TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  bom_id TEXT,
  source_work_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  qty REAL NOT NULL DEFAULT 0,
  plan_date TEXT,
  process_fee REAL DEFAULT 0,
  received_qty REAL DEFAULT 0,
  issue_outbound_no TEXT,
  receipt_inbound_nos TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_sco_org_status ON subcontract_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sco_org_vendor ON subcontract_orders(org_id, vendor_id);

-- 2. 委外发料明细（行表）
CREATE TABLE IF NOT EXISTS subcontract_issue_items (
  id TEXT PRIMARY KEY,
  subcontract_order_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  unit TEXT,
  qty REAL,
  FOREIGN KEY (subcontract_order_id) REFERENCES subcontract_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sco_issue_order ON subcontract_issue_items(subcontract_order_id);

-- 3. 版本控制
INSERT INTO schema_migrations (version, applied_at) VALUES ('0011_subcontract_orders', datetime('now')) ON CONFLICT(version) DO NOTHING;
