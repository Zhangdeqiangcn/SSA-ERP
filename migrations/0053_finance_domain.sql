-- 迁移 0053：财务域剩余切片关系化 —— C1 第三个域（V3.7.0）
--
-- ── 背景：这个域是「迁了一半」的典型 ──────────────────────────────
-- 财务域的**凭证**部分（vouchers / voucher_items）在 V3.x 的「W1 根治双通道」
-- 中已经迁到真实 D1 表，`partialize` 也把 vouchers 排除在 Blob 之外。
-- 但**其余 7 个切片仍在 app_state 的 JSON 大对象里**：
--
--   invoices 1.80 KB / paymentPlans 1.49 KB / accountEntries 4.04 KB /
--   financeStats 0.12 KB / taxRecords 1.46 KB / projectAccounts 2.88 KB /
--   chartOfAccounts 3.04 KB     合计 15.0 KB
--
-- 这个「一半在表、一半在 Blob」的状态比全在 Blob 更危险：
--   ① 凭证已按行存储，但**发票还在 Blob**，于是「发票 → 凭证」的关联
--      一头是关系、一头是 JSON，外键约束加不上，级联删除做不了。
--   ② 排查问题时无法判断「这条发票到底在库里还是在浏览器里」。
--   ③ `loadVouchers()` 已经会从 D1 拉数据，而发票不会 —— 换台电脑打开，
--      凭证还在、发票没了，且没有任何报错。
--
-- ── 本迁移的范围与取舍 ─────────────────────────────────────────
-- 一次把 7 个切片全部关系化。它们都是**平表结构**（无嵌套），
-- 相比 BOM 的三层嵌套、打印模板的图片外置，这是最简单的形态。
--
-- 两个特例单独说明：
--   · `chartOfAccounts`（会计科目表）是**主数据**（21 条），
--     有 `parentCode` 自引用形成科目树，但树只有两级，用物化列即可，
--     不需要递归 CTE。
--   · `accountEntries`（分录）在 `vouchers` 迁移后语义上已**被凭证行取代**，
--     保留它是因为 `vouchers` 是由分录派生的、且老数据需要可追溯。
--     这里仍建表并回填，标记为 `legacy` 来源，不做删除 —— 删数据的风险
--     远大于多留一张表的成本。
--
-- ── 组织归属 ──────────────────────────────────────────────────
-- 全部带 `org_id`（财务数据是强组织隔离的，跨组织可见属于严重问题）。
-- 子表（如 payment_plan_installments）通过父表 id 从属，不重复存 org_id。

-- ==================== 发票 ====================
CREATE TABLE IF NOT EXISTS fin_invoices (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  invoice_no TEXT NOT NULL,
  invoice_type TEXT,                  -- vat_special | vat_normal | receipt
  status TEXT,                        -- draft | submitted | verified | paid | cancelled
  vendor_name TEXT,
  vendor_tax_no TEXT,
  purchase_order_no TEXT,
  invoice_date TEXT,
  received_date TEXT,
  amount REAL DEFAULT 0,              -- 不含税金额
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  exchange_rate REAL DEFAULT 1,
  verified_by TEXT,
  verified_at TEXT,
  note TEXT,
  voucher_generated INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE (org_id, invoice_no)
);
CREATE INDEX IF NOT EXISTS idx_fin_invoice_no ON fin_invoices(org_id, invoice_no);
CREATE INDEX IF NOT EXISTS idx_fin_invoice_status ON fin_invoices(org_id, status, invoice_date);
CREATE INDEX IF NOT EXISTS idx_fin_invoice_po ON fin_invoices(org_id, purchase_order_no);
CREATE INDEX IF NOT EXISTS idx_fin_invoice_vendor ON fin_invoices(org_id, vendor_name);

-- ==================== 付款计划（含多期） ====================
CREATE TABLE IF NOT EXISTS fin_payment_plans (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  plan_no TEXT NOT NULL,
  vendor_name TEXT,
  vendor_id TEXT,
  purchase_order_no TEXT,
  invoice_no TEXT,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  status TEXT,                        -- pending | partial | paid | overdue
  due_date TEXT,
  paid_date TEXT,
  payment_method TEXT,
  bank_account TEXT,
  note TEXT,
  voucher_generated INTEGER DEFAULT 0,
  advance_amount REAL DEFAULT 0,
  advance_occupied INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  exchange_rate REAL DEFAULT 1,
  created_at TEXT,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE (org_id, plan_no)
);
CREATE INDEX IF NOT EXISTS idx_fin_plan_no ON fin_payment_plans(org_id, plan_no);
CREATE INDEX IF NOT EXISTS idx_fin_plan_due ON fin_payment_plans(org_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_fin_plan_po ON fin_payment_plans(org_id, purchase_order_no);

-- 多期付款明细：一期一行。原实现把它放在父对象的 installments 数组里，
-- 后果是「某期付款了没」无法用 SQL 统计（要拉全部计划再在前端数）。
CREATE TABLE IF NOT EXISTS fin_payment_plan_installments (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,              -- 从属计划，不重复存 org_id
  seq INTEGER DEFAULT 0,
  type TEXT,                          -- advance | progress | final | lump
  label TEXT,
  amount REAL DEFAULT 0,
  due_date TEXT,
  status TEXT,
  paid_date TEXT,
  note TEXT,
  FOREIGN KEY (plan_id) REFERENCES fin_payment_plans(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fin_install_plan ON fin_payment_plan_installments(plan_id, seq);
CREATE INDEX IF NOT EXISTS idx_fin_install_due ON fin_payment_plan_installments(status, due_date);

-- ==================== 会计分录（legacy 来源） ====================
CREATE TABLE IF NOT EXISTS fin_account_entries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  entry_no TEXT,
  entry_date TEXT,
  period TEXT,
  summary TEXT,
  account_code TEXT,
  account_name TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  voucher_no TEXT,
  source TEXT DEFAULT 'legacy',
  created_at TEXT,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_entry_date ON fin_account_entries(org_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_fin_entry_period ON fin_account_entries(org_id, period);
CREATE INDEX IF NOT EXISTS idx_fin_entry_account ON fin_account_entries(org_id, account_code);
CREATE INDEX IF NOT EXISTS idx_fin_entry_voucher ON fin_account_entries(org_id, voucher_no);

-- ==================== 税务记录 ====================
CREATE TABLE IF NOT EXISTS fin_tax_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  period TEXT,
  tax_type TEXT,
  taxable_amount REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  status TEXT,
  declared_at TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_tax_period ON fin_tax_records(org_id, period, tax_type);

-- ==================== 项目核算 ====================
CREATE TABLE IF NOT EXISTS fin_project_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  project_no TEXT,
  project_name TEXT,
  customer_name TEXT,
  budget_amount REAL DEFAULT 0,
  actual_amount REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  cost REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  status TEXT,
  start_date TEXT,
  end_date TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_project_no ON fin_project_accounts(org_id, project_no);

-- ==================== 会计科目（主数据，两级树） ====================
CREATE TABLE IF NOT EXISTS fin_chart_of_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,                          -- asset | liability | equity | revenue | expense
  parent_code TEXT,                   -- 自引用形成科目树；仅两级，物化列足够
  is_leaf INTEGER DEFAULT 1,
  balance REAL DEFAULT 0,
  normal_side TEXT,                   -- debit | credit
  statement TEXT,                     -- BS | IS | CF
  section TEXT,
  created_at TEXT,
  updated_at TEXT,
  owner_id TEXT,
  dept_id TEXT,
  UNIQUE (org_id, code)
);
CREATE INDEX IF NOT EXISTS idx_fin_coa_code ON fin_chart_of_accounts(org_id, code);
CREATE INDEX IF NOT EXISTS idx_fin_coa_parent ON fin_chart_of_accounts(org_id, parent_code);
CREATE INDEX IF NOT EXISTS idx_fin_coa_stmt ON fin_chart_of_accounts(org_id, statement, section);

-- 幂等守卫（业务版本登记）
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0053_finance_domain', datetime('now'))
ON CONFLICT(version) DO NOTHING;
