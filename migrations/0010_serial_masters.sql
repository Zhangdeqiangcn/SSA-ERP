-- B2 三岛：序列号主档 + 序列号流转记录
PRAGMA foreign_keys = ON;

-- 1. 序列号主档
CREATE TABLE IF NOT EXISTS serial_masters (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  serial_no TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  batch_no TEXT,
  warehouse_id TEXT,
  hu_id TEXT,
  status TEXT NOT NULL DEFAULT 'in_stock',
  inbound_date TEXT,
  outbound_date TEXT,
  customer_name TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, serial_no)
);

CREATE INDEX IF NOT EXISTS idx_sm_org_status ON serial_masters(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sm_org_mat ON serial_masters(org_id, material_id);

-- 2. 序列号流转记录（行表）
CREATE TABLE IF NOT EXISTS serial_movements (
  id TEXT PRIMARY KEY,
  serial_master_id TEXT NOT NULL,
  type TEXT,
  doc_no TEXT,
  date TEXT,
  status TEXT,
  note TEXT,
  FOREIGN KEY (serial_master_id) REFERENCES serial_masters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sm_move_master ON serial_movements(serial_master_id);

-- 3. 版本控制
INSERT INTO schema_migrations (version, applied_at) VALUES ('0010_serial_masters', datetime('now')) ON CONFLICT(version) DO NOTHING;
