-- V2.80.0 W1：资金账户 + 资金流水迁真实 D1（根治双通道：多端实时共享，替代原本地存储 Blob）
-- 与前端 useCashMgmtStore（entityRepo 双资源 cashAccount/cashFlow）同源。
CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  account_no TEXT,
  account_name TEXT,
  bank TEXT,
  currency TEXT DEFAULT 'CNY',
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  remark TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_org ON cash_accounts(org_id);

CREATE TABLE IF NOT EXISTS cash_flows (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  account_id TEXT,
  direction TEXT,
  category TEXT,
  counterparty TEXT,
  amount REAL DEFAULT 0,
  flow_date TEXT,
  related_doc TEXT,
  remark TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_cash_flows_org ON cash_flows(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0026_cash', datetime('now'))
ON CONFLICT(version) DO NOTHING;
