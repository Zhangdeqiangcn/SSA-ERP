-- 迁移 0077：凭证模板与常用凭证（V3.26.0）
--
-- ── 为什么做这件事 ──────────────────────────────────────────
-- 财务手工制单时，大量凭证（如「计提工资」「摊销房租」「结转损益」）的分录结构高度重复，
-- 每次都要从零选科目、填借贷，既慢又容易出错。凭证模板 = 一套可复用的分录骨架，
-- 录入凭证时点「套用模板」即可把预设的摘要/科目/借贷方向一次性填好，金额留空待填。
--
-- 设计取舍（与打印模板 0052、凭证 0021 同一套原则）：
--   · 模板属于组织级基础配置（谁都不能看别的组织的模板）→ 带 org_id，RLS 登记为 'all'
--     （与 print_templates / vouchers 同属性：财务数据是组织内共享配置）。
--   · 模板头（voucher_templates）+ 模板分录行（voucher_template_items）两张表，
--     分录行从属模板，通过 template_id 关联，**不重复存 org_id**（与 0051 bom 同原则）。
--   · direction（借/贷）显式存，套用时直接映射成 voucher_items 的 debit/credit；
--     default_amount = 0 表示「套用时金额留空待填」，>0 表示带默认金额。
--   · 模板不带金额平衡约束——它只是骨架，套用后由凭证自身的借贷平衡闸（writeVoucher）把关。

CREATE TABLE IF NOT EXISTS voucher_templates (
  id           TEXT PRIMARY KEY,
  org_id       TEXT,
  name         TEXT NOT NULL,
  description  TEXT,
  voucher_type TEXT,                 -- 记/收/付/转，可选（套用时建议带入凭证字）
  is_default   INTEGER DEFAULT 0,    -- 同类凭证字下是否默认模板
  sort_order   INTEGER DEFAULT 0,
  created_by   TEXT,
  created_at   TEXT,
  updated_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_vtpl_org ON voucher_templates(org_id, is_default);
CREATE INDEX IF NOT EXISTS idx_vtpl_name ON voucher_templates(org_id, name);

CREATE TABLE IF NOT EXISTS voucher_template_items (
  id            TEXT PRIMARY KEY,
  template_id   TEXT NOT NULL,
  org_id        TEXT,
  line_no       INTEGER,
  summary       TEXT,
  account_code  TEXT,
  account_name  TEXT,
  direction     TEXT NOT NULL DEFAULT 'debit',  -- debit | credit
  default_amount REAL DEFAULT 0,                -- 0 = 套用时留空待填
  ledger_book   TEXT DEFAULT '0000',
  FOREIGN KEY (template_id) REFERENCES voucher_templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vtpl_item_tpl ON voucher_template_items(template_id);

-- 幂等守卫（业务版本登记）
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0077_voucher_templates', datetime('now'))
ON CONFLICT(version) DO NOTHING;
