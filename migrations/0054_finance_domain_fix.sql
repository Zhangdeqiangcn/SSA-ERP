-- 迁移 0054：修正财务域三张表的字段契约（V3.8.0）
--
-- ── 为什么要写这条迁移（这是一次自我纠正）─────────────────────────
-- 0053 建表时**没有对照前端真实类型**，列名是按「会计上应该长什么样」推断的。
-- 结果三张表与前端数据契约完全对不上：
--
--   · fin_account_entries
--       表：entry_date / summary / account_code / account_name / debit / credit
--       前端：date / description / debitAccount / creditAccount / amount
--       → 一个都对不上。若直接接入，每次写分录都会**静默丢掉全部业务字段**
--         （通用路由 pickSnake 只挑已登记列，未登记的键直接丢弃且不报错）。
--
--   · fin_tax_records
--       前端 TaxRecord 有 recordNo / periodType / category / deductedAmount /
--       actualPayable / paidAmount / paymentDate / remarks 共 8 个字段，表内一个都没有。
--       → 税务页会显示一堆空值，而界面不会报错。
--
--   · fin_project_accounts
--       表：budget_amount / actual_amount / start_date / end_date / note
--       前端：accountNo / totalBudget / totalActual / totalVariance /
--             grossProfit / grossMargin / revenue / preparedBy / approvedBy / remarks
--             以及**嵌套数组 costItems**（ProjectCostItem）
--       → 字段名几乎全不同，且 costItems 无处可存。
--
-- ── 为什么是「重建」而不是「加列」─────────────────────────────────
-- 加列（ALTER TABLE ADD COLUMN）不会丢数据，但会留下 16 个**永远为 NULL 的死列**
-- （entry_date / summary / account_code / account_name / debit / credit / tax_type /
--   declared_at / note / budget_amount / actual_amount / cost / profit / start_date …）。
-- 在会计凭证这类表里留下死列尤其危险：后来的人看到 `debit` 列会以为那就是借方金额，
-- 而真实金额在 `amount` 列 —— 一个列名就能让人算错账。
--
-- 因此这里选择重建。前提是这三张表**自建立以来没有任何一行数据**：
-- 0053 只建了表，从未有任何端点或 store 写入过它们（财务 store 此前仍写 app_state），
-- 本迁移执行前已用探针核对行数。空表重建的代价为零，且是唯一能留下干净结构的时机 ——
-- 等数据进来之后就再也没有这个机会了。
--
-- ── 契约来源 ───────────────────────────────────────────────────
-- 全部列名由 `src/types/finance.ts` 的对应 interface 反推（snake_case），
-- 不再由「会计常识」推断。**表结构必须服从前端契约，而不是反过来。**

-- ==================== 会计分录：对齐 AccountEntry ====================
-- ⚠️ 必须用「DROP + CREATE」，不能改成「CREATE TABLE IF NOT EXISTS」：
--   0053 已用**另一套（错误列名）**建过这三张表；若这里用 IF NOT EXISTS，对已存在的表属**空操作**，
--   后果有二：① 本迁移「纠正列名」的初衷完全失效（全新库仍保留错误旧列名）；
--   ② 紧随其后的 `CREATE INDEX ...(org_id, period)` 会因旧表没有 period 列**直接报错中断**，
--      使 0055 及之后**全部迁移（含 0069）无法下发**。
--   原 DB-005 判据「重新部署会重放迁移并清空财务表」**不成立**：wrangler 按 d1_migrations 记录跳过
--   已应用迁移，不会重放；而此三表在本迁移执行时点已核验为**空表**（0053 只建表、无任何写入方），
--   故「先删后建」的重建代价为零。生产库早已记录 0054，本改动不会在其上重跑，零风险。
DROP TABLE IF EXISTS fin_account_entries;
CREATE TABLE fin_account_entries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  entry_no TEXT,                      -- entryNo
  date TEXT,                          -- date（记账日期；前端字段名就叫 date）
  period TEXT,                        -- 派生冗余列：供报表按会计期间聚合
  description TEXT,                   -- description（摘要）
  debit_account TEXT,                 -- debitAccount（借方科目名）
  credit_account TEXT,                -- creditAccount（贷方科目名）
  amount REAL DEFAULT 0,              -- amount（单列金额；方向由借贷两列决定）
  currency TEXT DEFAULT 'CNY',
  voucher_no TEXT,                    -- voucherNo
  cost_center_id TEXT,                -- 辅助核算：成本中心
  cost_center_name TEXT,
  project_id TEXT,                    -- 辅助核算：项目
  project_name TEXT,
  aux_note TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_entry_date ON fin_account_entries(org_id, date);
CREATE INDEX IF NOT EXISTS idx_fin_entry_period ON fin_account_entries(org_id, period);
CREATE INDEX IF NOT EXISTS idx_fin_entry_voucher ON fin_account_entries(org_id, voucher_no);
CREATE INDEX IF NOT EXISTS idx_fin_entry_account ON fin_account_entries(org_id, debit_account, credit_account);

-- ==================== 税务记录：对齐 TaxRecord ====================
-- ⚠️ 同上：必须重建，否则 IF NOT EXISTS 对 0053 已建的表是空操作（列名纠正失效）。
DROP TABLE IF EXISTS fin_tax_records;
CREATE TABLE fin_tax_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  record_no TEXT,                     -- recordNo
  period TEXT,
  period_type TEXT,                   -- periodType（月/季/年）
  category TEXT,                      -- category
  taxable_amount REAL DEFAULT 0,      -- taxableAmount
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  deducted_amount REAL DEFAULT 0,     -- deductedAmount
  actual_payable REAL DEFAULT 0,      -- actualPayable
  paid_amount REAL DEFAULT 0,         -- paidAmount
  payment_date TEXT,                  -- paymentDate
  status TEXT,                        -- pending | calculated | paid | reported
  remarks TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_tax_period ON fin_tax_records(org_id, period);
CREATE INDEX IF NOT EXISTS idx_fin_tax_status ON fin_tax_records(org_id, status);

-- ==================== 项目核算：对齐 ProjectAccount（头） ====================
-- ⚠️ 同上：必须重建。这就是全新库原先中断的地方——0053 的 fin_project_accounts 没有 period 列，
--   若沿用 IF NOT EXISTS 空操作，下面第 129 行的 (org_id, period) 索引会直接报「no such column: period」并中断。
--   子表先删（本迁移随后会重建它），避免重建父表时受外键牵连。
DROP TABLE IF EXISTS fin_project_cost_items;
DROP TABLE IF EXISTS fin_project_accounts;
CREATE TABLE fin_project_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  account_no TEXT,                    -- accountNo
  project_id TEXT,
  project_no TEXT,
  project_name TEXT,
  customer_name TEXT,
  period TEXT,
  total_budget REAL DEFAULT 0,        -- totalBudget
  total_actual REAL DEFAULT 0,
  total_variance REAL DEFAULT 0,
  revenue REAL DEFAULT 0,
  gross_profit REAL DEFAULT 0,
  gross_margin REAL DEFAULT 0,
  status TEXT,                        -- draft | submitted | approved
  prepared_by TEXT,
  approved_by TEXT,
  remarks TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_fin_project_no ON fin_project_accounts(org_id, project_no);
CREATE INDEX IF NOT EXISTS idx_fin_project_period ON fin_project_accounts(org_id, period);

-- ==================== 项目核算：成本明细（子表） ====================
-- ProjectAccount.costItems 是第二个嵌套数组（第一个是 PaymentPlan.installments）。
-- 不摊平进子表的后果与 BOM 的 children 完全同款：**界面顶层行都在，明细全空**。
CREATE TABLE IF NOT EXISTS fin_project_cost_items (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,           -- 从属项目核算单，不重复存 org_id
  seq INTEGER DEFAULT 0,
  category TEXT,                      -- material | labor | equipment | outsource | overhead | other
  description TEXT,
  budget_amount REAL DEFAULT 0,
  actual_amount REAL DEFAULT 0,
  variance REAL DEFAULT 0,
  variance_percent REAL DEFAULT 0,
  FOREIGN KEY (account_id) REFERENCES fin_project_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fin_pcost_account ON fin_project_cost_items(account_id, seq);

-- 幂等守卫
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0054_finance_domain_fix', datetime('now'))
ON CONFLICT(version) DO NOTHING;
