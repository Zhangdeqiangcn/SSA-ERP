-- V3.76.0 B 类第 4 批：应收应付台账 + Blob 残余迁 D1 关系表（审计 P1-1 / P1-5）
-- ① fin_receivables / fin_payables：应收/应付台账（原 arapStore persist 'ssa-erp-arap' 整状态 Blob）。
--    双源根因：服务端应收应付只到凭证科目层（arapPosting 写 2202/1122），前台另有一份手工台账 Blob，
--    两处对不上账。本版把台账落成 org 隔离关系表，invoice_no 与凭证 source_no 同键可对。
-- ② consignment_stocks：寄售库存（原 consignmentStore 'ssa-erp-consignment' Blob）。
-- ③ purchase_info_records：采购信息记录（原 purchaseInfoRecordStore 'ssa-erp-purchase-info-record' Blob）。
-- ④ sales_quotations：销售报价（原 salesAdvancedStore quotations 切片 'ssa-erp-sales-adv' Blob；
--    明细 items 封 extra_json，与 0096 sales_contracts 范式一致，头部金额列支持列表直查）。
-- 设计口径（对齐既有关系表范式）：
--   · org_id 隔离 + created_at/updated_at/created_by/updated_by 审计列 + created_by_name/updated_by_name（V3.71 0099 口径）；
--   · 嵌套明细封 extra_json，不改通用实体框架；
--   · 不新增源数据没有的唯一约束（铁律⑲：Blob 源无此约束，按「org_id + 业务键」非唯一索引处理，避免回填撞键）；
--   · 全部 CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS，可重复执行。

-- ──────────────────────────────────────────────
-- 应收台账（Receivable）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fin_receivables (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  invoice_no TEXT,
  amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  due_date TEXT,
  aging_bucket TEXT,
  status TEXT,
  remarks TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_receivables_org ON fin_receivables(org_id);
CREATE INDEX IF NOT EXISTS idx_fin_receivables_invoice ON fin_receivables(org_id, invoice_no);

-- ──────────────────────────────────────────────
-- 应付台账（Payable）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fin_payables (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  vendor_id TEXT,
  vendor_name TEXT,
  invoice_no TEXT,
  amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  due_date TEXT,
  aging_bucket TEXT,
  status TEXT,
  payment_date TEXT,
  remarks TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_payables_org ON fin_payables(org_id);
CREATE INDEX IF NOT EXISTS idx_fin_payables_invoice ON fin_payables(org_id, invoice_no);

-- ──────────────────────────────────────────────
-- 寄售库存（ConsignmentStock）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consignment_stocks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  vendor_id TEXT,
  vendor_name TEXT,
  vendor_code TEXT,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  specification TEXT,
  unit TEXT,
  agreed_unit_price REAL DEFAULT 0,
  consigned_qty REAL DEFAULT 0,
  consumed_qty REAL DEFAULT 0,
  balance_qty REAL DEFAULT 0,
  warehouse_id TEXT,
  warehouse_name TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_consignment_stocks_org ON consignment_stocks(org_id);

-- ──────────────────────────────────────────────
-- 采购信息记录（PurchaseInfoRecord）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_info_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  vendor_id TEXT,
  vendor_name TEXT,
  vendor_code TEXT,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  specification TEXT,
  unit TEXT,
  unit_price REAL DEFAULT 0,
  currency TEXT,
  valid_from TEXT,
  valid_to TEXT,
  min_qty REAL DEFAULT 0,
  lead_time INTEGER DEFAULT 0,
  purchasing_group TEXT,
  status TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_purchase_info_records_org ON purchase_info_records(org_id);
CREATE INDEX IF NOT EXISTS idx_purchase_info_records_vendor ON purchase_info_records(org_id, vendor_id);

-- ──────────────────────────────────────────────
-- 销售报价（Quotation 头；items 明细封 extra_json）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_quotations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  quotation_no TEXT,
  customer_name TEXT,
  customer_code TEXT,
  customer_id TEXT,
  status TEXT,
  valid_until TEXT,
  currency TEXT,
  total_amount REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  sales_person TEXT,
  remarks TEXT,
  source_prospect_id TEXT,
  converted_order_id TEXT,
  converted_order_no TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_org ON sales_quotations(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_no ON sales_quotations(org_id, quotation_no);
