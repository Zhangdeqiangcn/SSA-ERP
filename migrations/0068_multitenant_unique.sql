-- 迁移 0068：DB-003 多租户唯一约束修正（全局 UNIQUE → 按组织隔离）
--
-- ═══════════════ 背景（P1 审计报告 DB-003）══════════════
-- 以下业务单号/编码原为「全局唯一」（跨组织互斥），在多租户系统里是错误语义——
-- 不同组织应可各自使用相同单号/编码。正确语义为「按组织隔离」即 UNIQUE(org_id, 列)：
--   * vouchers.voucher_no      （0007_p1_phase5.sql 第 10 行：voucher_no TEXT NOT NULL UNIQUE）
--   * work_orders.order_no     （0007_p1_phase5.sql 第 78 行：order_no   TEXT NOT NULL UNIQUE）
--   * vendors.vendor_code      （0002_vendors.sql   第  7 行：vendor_code TEXT NOT NULL UNIQUE）
-- 而 0016_vendor_master.sql 已是 UNIQUE(org_id, vendor_code)，两套口径冲突，需把 vendors 也统一。
--
-- ═══════════════ 存量安全论证 ═══════════════
-- 原全局唯一已保证「同组织内绝不可能重复」，放宽到按组织维度必然仍成立，
-- 因此创建 UNIQUE(org_id, 列) 不会因存量数据失败（线上查重核对为 0 行）。
--
-- ═══════════════ D1 平台限制与修复方式 ═══════════════
-- 原方案是 DROP INDEX 掉 SQLite 内联 UNIQUE 自动生成的单列全局唯一索引
-- （sqlite_autoindex_vouchers_2 / sqlite_autoindex_work_orders_2 / sqlite_autoindex_vendors_2）。
-- 但实测 Cloudflare D1 不允许 DROP 由 UNIQUE/PRIMARY KEY 约束生成的自动索引，报错：
--   "index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped: SQLITE_ERROR [code: 7500]"
-- （本地 Miniflare 与线上 D1 表现一致，均为硬限制；区别于原生 SQLite 可 DROP 该自动索引。）
-- 因此改用「重建表」方式：以 UNIQUE(org_id, 列) 表级约束重建三张表，
-- 这同时与 0016_vendor_master 的 UNIQUE(org_id, vendor_code) 表级约束风格保持一致。
--
-- 注意 vouchers 存在入站外键：voucher_items.voucher_id → vouchers(id) ON DELETE CASCADE。
-- D1 在 DROP 父表 vouchers 时会级联删除子表 voucher_items 的数据，故重建 vouchers 前
-- 先把 voucher_items 快照为无外键的临时表（voucher_items_snap），解除引用后再重建，
-- 最后恢复 voucher_items（含外键与索引）。work_orders / vendors 无入站外键，直接重建。
--
-- 全部 DROP 临时表使用 IF EXISTS、重建索引使用 IF NOT EXISTS，保证可幂等重跑。

-- 防重跑：清理可能残留的临时表
DROP TABLE IF EXISTS vouchers_old;
DROP TABLE IF EXISTS work_orders_old;
DROP TABLE IF EXISTS vendors_old;
DROP TABLE IF EXISTS voucher_items_snap;

-- ════════════ 1) work_orders（无入站外键）═══════════
ALTER TABLE work_orders RENAME TO work_orders_old;
CREATE TABLE work_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  order_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  bom_id TEXT,
  bom_no TEXT,
  route_id TEXT,
  route_no TEXT,
  planned_quantity REAL NOT NULL DEFAULT 0,
  completed_quantity REAL NOT NULL DEFAULT 0,
  scrap_quantity REAL NOT NULL DEFAULT 0,
  qualified_quantity REAL DEFAULT 0,
  planned_start_date TEXT,
  planned_end_date TEXT,
  actual_start_date TEXT,
  actual_end_date TEXT,
  priority TEXT DEFAULT 'normal',
  workshop TEXT,
  supervisor TEXT,
  project_no TEXT,
  project_name TEXT,
  note TEXT,
  cost_center_id TEXT,
  actual_labor_cost REAL DEFAULT 0,
  actual_material_cost REAL DEFAULT 0,
  actual_machine_cost REAL DEFAULT 0,
  actual_total_cost REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id  TEXT,
  UNIQUE(org_id, order_no)
);
INSERT INTO work_orders (
  id, org_id, order_no, status, product_code, product_name, bom_id, bom_no, route_id, route_no,
  planned_quantity, completed_quantity, scrap_quantity, qualified_quantity, planned_start_date,
  planned_end_date, actual_start_date, actual_end_date, priority, workshop, supervisor,
  project_no, project_name, note, cost_center_id, actual_labor_cost, actual_material_cost,
  actual_machine_cost, actual_total_cost, created_at, updated_at, created_by, updated_by, owner_id, dept_id
) SELECT
  id, org_id, order_no, status, product_code, product_name, bom_id, bom_no, route_id, route_no,
  planned_quantity, completed_quantity, scrap_quantity, qualified_quantity, planned_start_date,
  planned_end_date, actual_start_date, actual_end_date, priority, workshop, supervisor,
  project_no, project_name, note, cost_center_id, actual_labor_cost, actual_material_cost,
  actual_machine_cost, actual_total_cost, created_at, updated_at, created_by, updated_by, owner_id, dept_id
FROM work_orders_old;
DROP TABLE work_orders_old;
CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_wo_product ON work_orders(org_id, product_code);
CREATE INDEX IF NOT EXISTS idx_wo_date ON work_orders(org_id, planned_start_date DESC);

-- ════════════ 2) vendors（无入站外键；保留出站外键 → orgs）═══════════
ALTER TABLE vendors RENAME TO vendors_old;
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  vendor_code TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendor',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  short_name TEXT,
  type TEXT CHECK (type IN ('manufacturer','trader','agent')),
  address TEXT,
  qualification_expiry TEXT,
  rating REAL,
  credit_level TEXT CHECK (credit_level IN ('AAA','AA','A','B','C')),
  credit_limit REAL DEFAULT 0,
  used_credit REAL DEFAULT 0,
  blacklist_reason TEXT,
  blacklisted_at TEXT,
  blacklist_reason_history TEXT,
  sales_org TEXT,
  reconciliation_account TEXT,
  tax_code TEXT,
  bank_account TEXT,
  profile_pending TEXT,
  profile_pending_at TEXT,
  profile_pending_by TEXT,
  profile_reviewed_by TEXT,
  custom_fields TEXT,
  owner_id TEXT,
  dept_id  TEXT,
  FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE,
  UNIQUE(org_id, vendor_code)
);
INSERT INTO vendors (
  id, org_id, vendor_code, company_name, contact_name, contact_phone, contact_email,
  password_hash, salt, role, status, created_at, short_name, type, address,
  qualification_expiry, rating, credit_level, credit_limit, used_credit, blacklist_reason,
  blacklisted_at, blacklist_reason_history, sales_org, reconciliation_account, tax_code,
  bank_account, profile_pending, profile_pending_at, profile_pending_by, profile_reviewed_by,
  custom_fields, owner_id, dept_id
) SELECT
  id, org_id, vendor_code, company_name, contact_name, contact_phone, contact_email,
  password_hash, salt, role, status, created_at, short_name, type, address,
  qualification_expiry, rating, credit_level, credit_limit, used_credit, blacklist_reason,
  blacklisted_at, blacklist_reason_history, sales_org, reconciliation_account, tax_code,
  bank_account, profile_pending, profile_pending_at, profile_pending_by, profile_reviewed_by,
  custom_fields, owner_id, dept_id
FROM vendors_old;
DROP TABLE vendors_old;
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_credit ON vendors(org_id, credit_level);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(org_id, type);
CREATE INDEX IF NOT EXISTS idx_vendors_owner ON vendors(org_id, owner_id);

-- ════════════ 3) vouchers（有入站外键：voucher_items → vouchers(id)）═══════════
-- 先把子表快照为无外键临时表，解除对 vouchers 的引用，避免 DROP vouchers 时级联删除子表数据
CREATE TABLE voucher_items_snap AS SELECT * FROM voucher_items;
DROP TABLE voucher_items;

ALTER TABLE vouchers RENAME TO vouchers_old;

-- ★★ 全新库必需：把 8 个「生产库有、全新库没有」的蛇形列补到 vouchers_old 上 ★★
-- 背景（真 Bug 换来的教训）：本文件下方 INSERT … SELECT 按 30 列搬运数据，但**全新库**的
--   vouchers 只有 22 列，缺 total_debit / total_credit / reviewed_by / reviewed_at /
--   posted_by / posted_at / reversed_by / reversed_at 这 8 列，于是 SELECT 在 prepare 阶段
--   直接报 `no such column: total_debit`，整个迁移中断（本地全新库实测，0069 因此也不下发）。
-- 根因：0007_p1_phase5.sql 的 vouchers 建表写的是**驼峰列**（totalDebit/totalCredit/createdBy/
--   reviewedBy/reviewedAt/postedBy/postedAt/reversedBy/reversedAt），而生产库当年是用**蛇形**
--   DDL 建的表（见 0066 的核证结论：生产库 30 列、含 reversed_by/reversed_at），随后 0064 只
--   负责删掉驼峰列 —— 结果生产库留下蛇形 9 列，全新库却变成「驼峰被删、蛇形从未创建」，
--   两种环境的列集从此分叉。本块把全新库补齐到与生产库一致，并让下方 SELECT 可解析。
-- 为什么这里可以写「裸 ADD COLUMN」而不做幂等：`wrangler d1 migrations apply` 只执行未应用的
--   迁移，本文件在生产库已登记（实测 schema_migrations 含 0068_multitenant_unique），永不重跑；
--   会执行到这一行的环境必然是「尚未应用 0068 的全新库」，而全新库一定缺这 8 列。
--   （SQLite 的 ADD COLUMN 无 IF NOT EXISTS，此处的确定性依赖上述前提，改动前必须重新确认。）
ALTER TABLE vouchers_old ADD COLUMN total_debit REAL NOT NULL DEFAULT 0;
ALTER TABLE vouchers_old ADD COLUMN total_credit REAL NOT NULL DEFAULT 0;
ALTER TABLE vouchers_old ADD COLUMN reviewed_by TEXT;
ALTER TABLE vouchers_old ADD COLUMN reviewed_at TEXT;
ALTER TABLE vouchers_old ADD COLUMN posted_by TEXT;
ALTER TABLE vouchers_old ADD COLUMN posted_at TEXT;
ALTER TABLE vouchers_old ADD COLUMN reversed_by TEXT;
ALTER TABLE vouchers_old ADD COLUMN reversed_at TEXT;

CREATE TABLE vouchers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft',
  total_debit REAL NOT NULL DEFAULT 0,
  total_credit REAL NOT NULL DEFAULT 0,
  created_by TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  posted_by TEXT,
  posted_at TEXT,
  reversed_by TEXT,
  reversed_at TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  owner_id TEXT,
  dept_id  TEXT,
  voucher_type TEXT,
  period TEXT,
  attachment_count INTEGER DEFAULT 0,
  source_no TEXT,
  currency TEXT DEFAULT 'CNY',
  reversed INTEGER DEFAULT 0,
  reversal_voucher_no TEXT,
  ledger_book TEXT NOT NULL DEFAULT '0000',
  UNIQUE(org_id, voucher_no)
);
INSERT INTO vouchers (
  id, org_id, voucher_no, date, description, source, status, total_debit, total_credit,
  created_by, reviewed_by, reviewed_at, posted_by, posted_at, reversed_by, reversed_at,
  remarks, created_at, updated_at, updated_by, owner_id, dept_id, voucher_type, period,
  attachment_count, source_no, currency, reversed, reversal_voucher_no, ledger_book
) SELECT
  id, org_id, voucher_no, date, description, source, status, total_debit, total_credit,
  created_by, reviewed_by, reviewed_at, posted_by, posted_at, reversed_by, reversed_at,
  remarks, created_at, updated_at, updated_by, owner_id, dept_id, voucher_type, period,
  attachment_count, source_no, currency, reversed, reversal_voucher_no, ledger_book
FROM vouchers_old;
DROP TABLE vouchers_old;
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(org_id, date DESC);

-- 恢复 voucher_items（含外键与索引）
CREATE TABLE voucher_items (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  summary TEXT,
  account_code TEXT,
  account_name TEXT,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  exchange_rate REAL DEFAULT 1,
  cost_center_id TEXT,
  project_id TEXT,
  ledger_book TEXT NOT NULL DEFAULT '0000',
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
);
INSERT INTO voucher_items (
  id, voucher_id, line_no, summary, account_code, account_name, debit, credit,
  currency, exchange_rate, cost_center_id, project_id, ledger_book
) SELECT
  id, voucher_id, line_no, summary, account_code, account_name, debit, credit,
  currency, exchange_rate, cost_center_id, project_id, ledger_book
FROM voucher_items_snap;
DROP TABLE voucher_items_snap;
CREATE INDEX IF NOT EXISTS idx_vi_voucher ON voucher_items(voucher_id);

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0068_multitenant_unique', datetime('now'))
ON CONFLICT(version) DO NOTHING;
