-- 迁移 0014：多币种外汇汇率表
-- 支持手动维护 + 从免费源(exchangerate.host，无需 key)刷新。
CREATE TABLE IF NOT EXISTS fx_rates (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'CNY',
  quote_currency TEXT NOT NULL,
  rate          REAL NOT NULL,
  source        TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'exchangerate.host'
  updated_at    TEXT NOT NULL,
  UNIQUE(org_id, base_currency, quote_currency)
);
CREATE INDEX IF NOT EXISTS idx_fx_org ON fx_rates(org_id);

-- 组织级设置（基准币种等），与 orgs 表互补，避免改 orgs schema
CREATE TABLE IF NOT EXISTS org_settings (
  org_id         TEXT PRIMARY KEY,
  base_currency  TEXT NOT NULL DEFAULT 'CNY',
  company_name   TEXT,
  updated_at     TEXT NOT NULL
);
