-- P1 Phase 4: 销售订单关系化
-- 新建 sales_orders / sales_order_items 表
-- D1 无 ALTER TABLE ADD COLUMN（SQLite），需单独执行

PRAGMA foreign_keys = ON;

-- 1. 销售订单主表
CREATE TABLE IF NOT EXISTS sales_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'draft',
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_code TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  project_id TEXT,
  project_no TEXT,
  project_name TEXT,
  total_amount REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  order_date TEXT NOT NULL,
  expected_delivery_date TEXT,
  actual_delivery_date TEXT,
  payment_terms TEXT,
  delivery_address TEXT,
  sales_person TEXT NOT NULL,
  trade_terms TEXT,
  ship_to_address TEXT,
  remarks TEXT,
  delivered_quantity REAL DEFAULT 0,
  received_amount REAL DEFAULT 0,
  ar_due_date TEXT,
  credit_occupied BOOLEAN DEFAULT 0,
  credit_amount REAL DEFAULT 0,
  shipping_mode TEXT DEFAULT 'standard',
  direct_ship_vendor_id TEXT,
  direct_ship_vendor_name TEXT,
  third_party_company_name TEXT,
  contract_id TEXT,
  contract_no TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(org_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(org_id, order_date DESC);

-- 2. 销售订单行表
CREATE TABLE IF NOT EXISTS sales_order_items (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  specification TEXT,
  unit TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  delivery_date TEXT,
  remarks TEXT,
  delivered_quantity REAL DEFAULT 0,
  FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_soi_order ON sales_order_items(sales_order_id);

-- 3. 版本控制
INSERT INTO schema_migrations (version, applied_at) VALUES ('0006_sales_orders', datetime('now')) ON CONFLICT(version) DO NOTHING;
