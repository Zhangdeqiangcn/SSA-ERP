-- W2 收尾：跨组织转储 stock_transfers + stock_transfer_items
-- 根治双通道：warehouseAdvancedStore.stockTransfers 切片由 app_state Blob 迁真实 D1。
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS stock_transfers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  transfer_no TEXT NOT NULL,
  from_warehouse_id TEXT,
  from_warehouse_name TEXT,
  to_warehouse_id TEXT,
  to_warehouse_name TEXT,
  from_org_id TEXT,
  to_org_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  transfer_date TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, transfer_no)
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_org ON stock_transfers(org_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_status ON stock_transfers(org_id, status);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id TEXT PRIMARY KEY,
  stock_transfer_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  unit TEXT,
  quantity REAL DEFAULT 0,
  batch_no TEXT,
  location_id TEXT,
  FOREIGN KEY (stock_transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stock_transfer_item_order ON stock_transfer_items(stock_transfer_id);

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0023_stock_transfers', datetime('now'))
ON CONFLICT(version) DO NOTHING;
