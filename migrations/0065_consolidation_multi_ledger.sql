-- V3.13.0 C2 基础：组织集团化 + 多账簿 + 合并报表底座
-- ── 设计要点 ───────────────────────────────────────────────────────
-- 合并报表/多账簿的"地基"此前完全缺位：
--   · orgs 表是扁平单组织（只有 id/name/company_code/created_at），
--     集团公司-子公司层级只存在于前端 orgStore 的 Blob 种子里，后端无数据。
--   · 凭证只有 currency，没有"账套/账簿"维度 —— 同一笔业务无法分别记到
--     法定账套与管理账套。
-- 本迁移只做"数据底座 + 维度"，不动任何既有业务逻辑：
--   · orgs 加层级字段（parent_id/org_type/ledger_code/currency/group_id），
--     并把既有组织归到以其自身 id 命名的默认集团（group_id 兜底），保证不破坏现状。
--   · vouchers/voucher_items 加 ledger_book（默认 '0000' 法定账套），
--     既有凭证一律归入法定账套，行为不变。
--   · 新建 4 张合并域表（账簿定义/合并范围/抵消规则/合并结果快照）。
-- 列注释统一用 '--'（规则 ⑱：'//' 会让 apply 报 syntax error）。

-- ① orgs 加集团化层级字段（均为可空或带默认值，不破坏既有行）
ALTER TABLE orgs ADD COLUMN parent_id TEXT;
ALTER TABLE orgs ADD COLUMN org_type TEXT NOT NULL DEFAULT 'company';
ALTER TABLE orgs ADD COLUMN ledger_code TEXT;
ALTER TABLE orgs ADD COLUMN currency TEXT NOT NULL DEFAULT 'CNY';
ALTER TABLE orgs ADD COLUMN group_id TEXT;

-- 既有组织兜底：group_id 为空的组织归入以其自身 id 命名的默认集团，
-- ledger_code 取 company_code，便于后续"同集团跨组织合并"直接可用。
UPDATE orgs SET
  group_id = 'GRP-' || id,
  org_type = COALESCE(org_type, 'company'),
  ledger_code = COALESCE(ledger_code, company_code),
  currency = COALESCE(currency, 'CNY')
WHERE group_id IS NULL;

-- ② vouchers / voucher_items 加"账簿(账套)"维度
ALTER TABLE vouchers ADD COLUMN ledger_book TEXT NOT NULL DEFAULT '0000';
ALTER TABLE voucher_items ADD COLUMN ledger_book TEXT NOT NULL DEFAULT '0000';

-- ③ 账簿定义表：一个组织可有多套账（法定/管理/税务…）
CREATE TABLE ledger_books (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  ledger_code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'legal',   -- legal=法定 / management=管理 / tax=税务
  base_currency TEXT NOT NULL DEFAULT 'CNY',
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);
CREATE UNIQUE INDEX uniq_ledger_books_org_code ON ledger_books(org_id, ledger_code);

-- ④ 合并范围（集团）：成员组织以 JSON 数组存放于 member_org_ids
CREATE TABLE consolidation_groups (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  member_org_ids TEXT NOT NULL DEFAULT '[]',   -- JSON 数组，存组织 id
  base_currency TEXT NOT NULL DEFAULT 'CNY',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);
CREATE UNIQUE INDEX uniq_consolidation_groups_org_code ON consolidation_groups(org_id, code);

-- ⑤ 内部交易抵消规则：合并时抵消"应收 vs 应付"等内部往来
CREATE TABLE elimination_rules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  receivable_account TEXT NOT NULL,   -- 内部往来资产方科目（如 应收账款）
  payable_account TEXT NOT NULL,       -- 内部往来负债方科目（如 应付账款）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);
CREATE UNIQUE INDEX uniq_elimination_rules_org_code ON elimination_rules(org_id, code);

-- ⑥ 合并结果快照：合并试算平衡 + 抵消明细序列化为 JSON 落库，便于复看
CREATE TABLE consolidation_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'books',   -- books=同组织跨账簿 / group=跨组织集团
  period TEXT,
  base_currency TEXT NOT NULL DEFAULT 'CNY',
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX idx_consolidation_runs_org ON consolidation_runs(org_id, group_id, period);
