-- V2.80.0 W1：三方销售（代销结算）迁真实 D1（根治双通道）
-- 与前端 useTripartySalesStore（entityRepo 资源 tripartySale）同源。
CREATE TABLE IF NOT EXISTS triparty_sales (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  doc_no TEXT,
  party_code TEXT,
  party_name TEXT,
  customer_name TEXT,
  warehouse TEXT,
  material_code TEXT,
  material_name TEXT,
  spec TEXT,
  quantity REAL DEFAULT 0,
  unit TEXT,
  settle_price REAL DEFAULT 0,
  amount REAL DEFAULT 0,
  settle_status TEXT DEFAULT 'pending',
  order_date TEXT,
  settle_date TEXT,
  remark TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_triparty_sales_org ON triparty_sales(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0027_triparty_sales', datetime('now'))
ON CONFLICT(version) DO NOTHING;
