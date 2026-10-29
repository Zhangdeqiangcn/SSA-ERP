-- P1 Phase 3: 采购订单关系化
-- 新建 purchase_orders / purchase_order_items / inbound_orders / inbound_order_items
-- / outbound_orders / outbound_order_items 六张表
-- D1 无 ALTER TABLE ADD COLUMN（SQLite），需单独执行

PRAGMA foreign_keys = ON;

-- 1. 采购订单主表
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  vendor_name TEXT,
  contact TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  purchase_type TEXT DEFAULT 'material',
  order_date TEXT NOT NULL,
  expected_delivery_date TEXT,
  actual_delivery_date TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  exchange_rate REAL DEFAULT 1,
  tax_included BOOLEAN DEFAULT 0,
  total_tax_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  payment_terms TEXT,
  trade_terms TEXT,
  delivery_address TEXT,
  remarks TEXT,
  project_no TEXT,
  project_name TEXT,
  delivered_quantity REAL DEFAULT 0,
  credit_occupied BOOLEAN DEFAULT 0,
  credit_amount REAL DEFAULT 0,
  credit_released_amount REAL DEFAULT 0,
  confirmed_by TEXT,
  confirmed_at TEXT,
  confirmed_note TEXT,
  order_mode TEXT DEFAULT 'standard',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(org_id, order_date DESC);

-- 2. 采购订单行表
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  specification TEXT,
  unit TEXT,
  ordered_quantity REAL NOT NULL DEFAULT 0,
  delivered_quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  price_with_tax REAL DEFAULT 0,
  amount_with_tax REAL DEFAULT 0,
  remarks TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);

-- 3. 入库单主表
CREATE TABLE IF NOT EXISTS inbound_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  inbound_no TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'purchase',
  source_no TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT,
  operator TEXT NOT NULL,
  inbound_date TEXT NOT NULL,
  total_cost REAL DEFAULT 0,
  subcontract_material_cost REAL DEFAULT 0,
  asn_shipment_no TEXT,
  remarks TEXT,
  inventory_posted BOOLEAN DEFAULT 0,
  cost_posted BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, inbound_no)
);

CREATE INDEX IF NOT EXISTS idx_inbound_vendor ON inbound_orders(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_inbound_status ON inbound_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_inbound_date ON inbound_orders(org_id, inbound_date DESC);

-- 4. 入库单行表
CREATE TABLE IF NOT EXISTS inbound_order_items (
  id TEXT PRIMARY KEY,
  inbound_order_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  specification TEXT,
  unit TEXT,
  expected_quantity REAL NOT NULL DEFAULT 0,
  actual_quantity REAL NOT NULL DEFAULT 0,
  batch_no TEXT,
  location_id TEXT,
  location_name TEXT,
  quality_status TEXT NOT NULL DEFAULT 'qualified',
  unit_price REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  serial_nos TEXT,
  hu_id TEXT,
  production_date TEXT,
  expiry_date TEXT,
  FOREIGN KEY (inbound_order_id) REFERENCES inbound_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inoi_order ON inbound_order_items(inbound_order_id);

-- 5. 出库单主表
CREATE TABLE IF NOT EXISTS outbound_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  outbound_no TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sale',
  source_no TEXT,
  customer_id TEXT,
  customer_name TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT,
  operator TEXT NOT NULL,
  outbound_date TEXT NOT NULL,
  remarks TEXT,
  inventory_posted BOOLEAN DEFAULT 0,
  cogs_posted BOOLEAN DEFAULT 0,
  picker TEXT,
  packaging_method TEXT,
  package_count INTEGER,
  weight REAL,
  volume REAL,
  shipping_company TEXT,
  tracking_no TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, outbound_no)
);

CREATE INDEX IF NOT EXISTS idx_outbound_customer ON outbound_orders(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_outbound_vendor ON outbound_orders(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_outbound_status ON outbound_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_outbound_date ON outbound_orders(org_id, outbound_date DESC);

-- 6. 出库单行表
CREATE TABLE IF NOT EXISTS outbound_order_items (
  id TEXT PRIMARY KEY,
  outbound_order_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  specification TEXT,
  unit TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  batch_no TEXT,
  location_id TEXT,
  location_name TEXT,
  unit_cost REAL DEFAULT 0,
  cost_amount REAL DEFAULT 0,
  serial_nos TEXT,
  hu_id TEXT,
  FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ooi_order ON outbound_order_items(outbound_order_id);

-- 7. 版本控制
INSERT INTO schema_migrations (version, applied_at) VALUES ('0005_purchase_orders', datetime('now')) ON CONFLICT(version) DO NOTHING;
