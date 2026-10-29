-- V3.63.0 退货独立单据关系化（根治审计 P1-VP-2 无独立后端单据）：
-- 此前销售/采购退货单据嵌在 salesAdvancedStore/purchaseAdvancedStore 的 app_state Blob 里，
-- 无独立关系表，无法被财务/供应商按行引用。现迁为 sales_returns / purchase_returns 两张真实表，
-- 行项目（items）封进 extra_json。completeReturn 的财务红冲逻辑保留（已存在），仅改为关系化落库。
CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  return_no TEXT,
  sales_order_no TEXT,
  customer_name TEXT,
  status TEXT,
  return_date TEXT,
  reason TEXT,
  total_amount REAL DEFAULT 0,
  credit_note_no TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  return_no TEXT,
  purchase_order_no TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  status TEXT,
  return_date TEXT,
  reason TEXT,
  total_amount REAL DEFAULT 0,
  voucher_no TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
