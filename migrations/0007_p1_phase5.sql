-- P1 Phase 5: 凭证/库存/工单关系化
-- vouchers / voucher_items / inventory_records / work_orders

PRAGMA foreign_keys = ON;

-- 1. 凭证表
CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  totalDebit REAL NOT NULL DEFAULT 0,
  totalCredit REAL NOT NULL DEFAULT 0,
  createdBy TEXT,
  reviewedBy TEXT,
  reviewedAt TEXT,
  postedBy TEXT,
  postedAt TEXT,
  reversedBy TEXT,
  reversedAt TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(org_id, date DESC);

-- 2. 凭证分录行表
CREATE TABLE IF NOT EXISTS voucher_items (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  summary TEXT,
  account_code TEXT,
  account_name TEXT,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  exchange_rate REAL DEFAULT 1,
  cost_center_id TEXT,
  project_id TEXT,
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vi_voucher ON voucher_items(voucher_id);

-- 3. 库存记录表
CREATE TABLE IF NOT EXISTS inventory_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  material_id TEXT NOT NULL,
  material_code TEXT NOT NULL,
  material_name TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT,
  location_id TEXT,
  location_name TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  available_quantity REAL NOT NULL DEFAULT 0,
  frozen_quantity REAL NOT NULL DEFAULT 0,
  unit TEXT,
  last_inbound_date TEXT,
  last_outbound_date TEXT,
  shelf_life_status TEXT DEFAULT 'normal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_unique ON inventory_records(org_id, material_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inv_material ON inventory_records(org_id, material_id);

-- 4. 生产工单表
CREATE TABLE IF NOT EXISTS work_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  order_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  bom_id TEXT,
  bom_no TEXT,
  route_id TEXT,
  route_no TEXT,
  planned_quantity REAL NOT NULL DEFAULT 0,
  completed_quantity REAL NOT NULL DEFAULT 0,
  scrap_quantity REAL NOT NULL DEFAULT 0,
  qualified_quantity REAL DEFAULT 0,
  planned_start_date TEXT,
  planned_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  priority TEXT DEFAULT 'normal',
  workshop TEXT,
  supervisor TEXT,
  project_no TEXT,
  project_name TEXT,
  note TEXT,
  cost_center_id TEXT,
  actual_labor_cost REAL DEFAULT 0,
  actual_material_cost REAL DEFAULT 0,
  actual_machine_cost REAL DEFAULT 0,
  actual_total_cost REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_wo_product ON work_orders(org_id, product_code);
CREATE INDEX IF NOT EXISTS idx_wo_date ON work_orders(org_id, planned_start_date DESC);

-- 5. 版本控制
INSERT INTO schema_migrations (version, applied_at) VALUES ('0007_p1_phase5', datetime('now')) ON CONFLICT(version) DO NOTHING;
