-- V3.65.0 立项④：供应商框架协议（协议价基准）关系化
-- 根治 P1-4「付款价核验缺协议价基准表」：此前框架协议只活在 purchaseAdvancedStore
--   的 app_state Blob（前端 persist 整块），后端无表 → 付款核验查不到协议价，只能做
--   「累计超计划总额」最小留痕（供应商 master 无价格列，硬做即造假，V3.64 诚实降级）。
-- 现在：框架协议 + 明细（ceiling_price 协议价上限）落真实 D1 关系表，
--   arapPosting.generatePaymentVoucher 付款前按供应商生效协议的物料 ceiling_price
--   做价格偏离核验（经 fin_payment_plans.purchase_order_no → 采购订单明细 → 物料 →
--   该供应商生效协议行 ceiling_price），超协议价上浮阈值在凭证摘要留痕待审；
--   无协议/无基准时回退既有「累计超计划总额」留痕，绝不造假基准（诚实降级同口径）。
CREATE TABLE IF NOT EXISTS framework_agreements (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agreement_no TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',        -- active | expired | closed
  start_date TEXT,
  end_date TEXT,
  currency TEXT DEFAULT 'CNY',
  total_ceiling REAL DEFAULT 0,               -- 协议总额上限
  released_amount REAL DEFAULT 0,             -- 已释放金额
  remarks TEXT,
  extra_json TEXT,                            -- 嵌套封 releases（框架协议释放记录）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_framework_org ON framework_agreements(org_id, vendor_id, status);

CREATE TABLE IF NOT EXISTS framework_agreement_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  agreement_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  unit TEXT,
  ceiling_price REAL NOT NULL DEFAULT 0,      -- ★ 协议价上限（付款核验基准）
  committed_qty REAL DEFAULT 0,               -- 协议承诺量
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_fai_agreement ON framework_agreement_items(agreement_id);
CREATE INDEX IF NOT EXISTS idx_fai_material ON framework_agreement_items(org_id, material_code, material_id);
