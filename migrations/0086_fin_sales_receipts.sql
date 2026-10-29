-- V3.61.0 P0-2 · 销售收款单（补齐应收账款冲减侧）
-- 背景：V3.60.0 补齐了「销售开票确认应收 1122」（应收增加侧），但收款冲减侧从未存在
--   —— 全库无销售收款端点，1002 只出现在采购付款，应收 1122 只增不减，
--   应收账龄/周转率/DSO 永久失真，且与采购侧（付款会冲应付）不对称。
--
-- 本表登记每一笔客户收款：单据 → 自动凭证（借1002 银行存款 / 贷1122 应收账款）。
CREATE TABLE IF NOT EXISTS fin_sales_receipts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  receipt_no TEXT NOT NULL,          -- 收款单号（幂等键来源）
  receipt_date TEXT,                -- 收款日期（决定会计期间）
  customer_id TEXT,
  customer_name TEXT,
  sales_order_no TEXT,              -- 关联销售订单（可空：预收/非订单收款）
  amount REAL DEFAULT 0,            -- 收款金额（价税合计，与开票口径一致）
  currency TEXT DEFAULT 'CNY',
  exchange_rate REAL DEFAULT 1,
  payment_method TEXT,              -- transfer | cash | check | acceptance
  bank_account TEXT,
  status TEXT DEFAULT 'posted',     -- draft | posted | cancelled
  voucher_generated INTEGER DEFAULT 0,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE (org_id, receipt_no)
);
CREATE INDEX IF NOT EXISTS idx_fin_sales_receipt_no ON fin_sales_receipts(org_id, receipt_no);
CREATE INDEX IF NOT EXISTS idx_fin_sales_receipt_date ON fin_sales_receipts(org_id, receipt_date);
CREATE INDEX IF NOT EXISTS idx_fin_sales_receipt_so ON fin_sales_receipts(org_id, sales_order_no);
CREATE INDEX IF NOT EXISTS idx_fin_sales_receipt_cust ON fin_sales_receipts(org_id, customer_name);
