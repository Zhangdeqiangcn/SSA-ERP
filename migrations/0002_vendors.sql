-- 供应商门户账号表
-- 外部供应商可自助注册，登录后查看自己公司的订单/质量/财务数据

CREATE TABLE IF NOT EXISTS vendors (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  vendor_code   TEXT NOT NULL UNIQUE,  -- 供应商代码（如 V001）
  company_name  TEXT NOT NULL,         -- 供应商公司名称
  contact_name  TEXT NOT NULL,         -- 联系人姓名
  contact_phone TEXT,
  contact_email TEXT,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'vendor',  -- vendor/approver/admin
  status        TEXT NOT NULL DEFAULT 'pending', -- pending/active/suspended
  created_at    TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(vendor_code);
