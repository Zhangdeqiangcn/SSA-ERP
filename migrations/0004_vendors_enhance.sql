-- P1 Phase 2: 增强 vendors 表字段（补齐短名、类型、资质、评级、信用、黑名单等）
-- 不删除已有字段，仅新增缺失列
ALTER TABLE vendors ADD COLUMN short_name TEXT;
ALTER TABLE vendors ADD COLUMN type TEXT CHECK (type IN ('manufacturer','trader','agent'));
ALTER TABLE vendors ADD COLUMN address TEXT;
ALTER TABLE vendors ADD COLUMN qualification_expiry TEXT;
ALTER TABLE vendors ADD COLUMN rating REAL;
ALTER TABLE vendors ADD COLUMN credit_level TEXT CHECK (credit_level IN ('AAA','AA','A','B','C'));
ALTER TABLE vendors ADD COLUMN credit_limit REAL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN used_credit REAL DEFAULT 0;
ALTER TABLE vendors ADD COLUMN blacklist_reason TEXT;
ALTER TABLE vendors ADD COLUMN blacklisted_at TEXT;
ALTER TABLE vendors ADD COLUMN blacklist_reason_history TEXT;  -- JSON array
ALTER TABLE vendors ADD COLUMN sales_org TEXT;
ALTER TABLE vendors ADD COLUMN reconciliation_account TEXT;
ALTER TABLE vendors ADD COLUMN tax_code TEXT;
ALTER TABLE vendors ADD COLUMN bank_account TEXT;
ALTER TABLE vendors ADD COLUMN profile_pending TEXT;           -- JSON
ALTER TABLE vendors ADD COLUMN profile_pending_at TEXT;
ALTER TABLE vendors ADD COLUMN profile_pending_by TEXT;
ALTER TABLE vendors ADD COLUMN profile_reviewed_by TEXT;
ALTER TABLE vendors ADD COLUMN custom_fields TEXT;             -- JSON object

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vendors_credit ON vendors(org_id, credit_level);
CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(org_id, type);

-- 记录迁移版本
INSERT INTO schema_migrations (version, applied_at) VALUES (4, datetime('now'))
ON CONFLICT(version) DO NOTHING;
