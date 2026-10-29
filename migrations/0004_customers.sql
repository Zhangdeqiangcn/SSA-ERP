-- P1 Phase 2: 新建 customers 表
CREATE TABLE IF NOT EXISTS customers (
  -- 主键 & 组织隔离
  org_id          TEXT NOT NULL,
  id              TEXT NOT NULL,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  short_name      TEXT,
  type            TEXT CHECK (type IN ('direct','distributor','agent','end_user')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','blacklisted')),

  -- 信用管控
  credit_level    TEXT CHECK (credit_level IN ('AAA','AA','A','B','C')),
  credit_limit    REAL DEFAULT 0,
  used_credit     REAL DEFAULT 0,
  settlement_term_days INTEGER DEFAULT 30,

  -- 开票信息
  tax_id          TEXT,
  invoice_title   TEXT,
  invoice_address TEXT,
  invoice_phone   TEXT,

  -- 银行信息
  bank_name       TEXT,
  bank_account    TEXT,
  bank_account_name TEXT,

  -- 联系人 / 地址
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  address         TEXT,

  -- 默认交易选项
  default_currency TEXT DEFAULT 'CNY',
  default_tax_rate REAL,

  -- 销售组织与会计（P0-10）
  sales_org           TEXT,
  reconciliation_account TEXT,
  tax_code            TEXT,

  remarks             TEXT,
  custom_fields       TEXT,  -- JSON object

  -- 审计
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  created_by          TEXT NOT NULL,
  updated_by          TEXT NOT NULL,

  PRIMARY KEY (id),
  UNIQUE(org_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(org_id, code);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(org_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_credit ON customers(org_id, credit_level);

-- 记录迁移版本
INSERT INTO schema_migrations (version, applied_at) VALUES (5, datetime('now'))
ON CONFLICT(version) DO NOTHING;
