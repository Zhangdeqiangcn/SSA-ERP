-- V2.74.2: 供应商主数据关系表（与门户登录表 vendors 解耦）
-- 网关 /api/open/vendors 现指向本表，避免误写门户凭据(password_hash/salt NOT NULL) 与 SELECT * 泄露凭据。
-- 与 materials/customers 同构：org_id 隔离 + 审计列 NOT NULL + owner_id/dept_id（RLS 预留，可空）。
CREATE TABLE IF NOT EXISTS vendor_master (
  org_id          TEXT NOT NULL,
  id              TEXT NOT NULL,

  -- 主数据列（snake_case，对应 src/types/vendor.ts Vendor 业务字段）
  vendor_code     TEXT,
  company_name    TEXT,
  short_name      TEXT,
  type            TEXT CHECK (type IN ('manufacturer','trader','agent')),
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  address         TEXT,
  status          TEXT CHECK (status IN ('registered','pending','approved','rejected','blacklisted')),
  credit_level    TEXT CHECK (credit_level IN ('AAA','AA','A','B','C')),
  credit_limit    REAL DEFAULT 0,
  used_credit     REAL DEFAULT 0,
  tax_id          TEXT,
  bank_account    TEXT,
  sales_org       TEXT,
  reconciliation_account TEXT,
  tax_code        TEXT,
  rating          REAL,
  blacklist_reason TEXT,
  blacklisted_at  TEXT,
  qualification_expiry TEXT,
  remarks         TEXT,

  -- RLS 预留（V2.74.0 行级策略维度，可空以兼容存量/网关写）
  owner_id        TEXT,
  dept_id         TEXT,

  -- 审计列（NOT NULL，网关写操作须补齐，见 presentCols 探测）
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  created_by      TEXT NOT NULL,
  updated_by      TEXT NOT NULL,

  PRIMARY KEY (id),
  UNIQUE(org_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendor_master_org ON vendor_master(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_master_code ON vendor_master(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendor_master_status ON vendor_master(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_master_type ON vendor_master(org_id, type);

-- 幂等守卫（version 为 TEXT 主键）
INSERT INTO schema_migrations (version, applied_at) VALUES ('0016_vendor_master', datetime('now'))
ON CONFLICT(version) DO NOTHING;
