-- W2 收尾：库存调整单 inventory_adjustments + inventory_adjustment_items
-- 根治双通道：warehouseAdvancedStore.inventoryAdjustments 切片由 app_state Blob 迁真实 D1。
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  adjustment_no TEXT NOT NULL,
  warehouse_id TEXT,
  warehouse_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  reason TEXT,
  date TEXT,
  total_delta_qty REAL DEFAULT 0,
  voucher_no TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, adjustment_no)
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_org ON inventory_adjustments(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_status ON inventory_adjustments(org_id, status);

CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
  id TEXT PRIMARY KEY,
  inventory_adjustment_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  unit TEXT,
  location_id TEXT,
  book_qty REAL DEFAULT 0,
  actual_qty REAL DEFAULT 0,
  delta_qty REAL DEFAULT 0,
  reason TEXT,
  FOREIGN KEY (inventory_adjustment_id) REFERENCES inventory_adjustments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_item_order ON inventory_adjustment_items(inventory_adjustment_id);

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0024_inventory_adjustments', datetime('now'))
ON CONFLICT(version) DO NOTHING;
