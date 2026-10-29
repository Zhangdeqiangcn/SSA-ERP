-- V2.74.3: vendor_master 扩展列（前端 vendorStore 直连 D1 所需）
-- 让 vendor_master 覆盖 Vendor 业务模型的全部字段，与网关 open/vendors 端点、会话端点 /api/vendors 完全同构。
-- 对标 functions/api/vendors/[id].ts 的 UPDATE 列集合，避免 no such column。
-- 说明：D1 的 SQLite 不支持 ALTER TABLE ... ADD COLUMN IF NOT EXISTS，本迁移仅 apply 一次（成功后写入
-- schema_migrations 守卫，wrangler 不会重复执行），故用纯 ADD COLUMN。

ALTER TABLE vendor_master ADD COLUMN blacklist_reason_history TEXT;
ALTER TABLE vendor_master ADD COLUMN profile_pending TEXT;
ALTER TABLE vendor_master ADD COLUMN profile_pending_at TEXT;
ALTER TABLE vendor_master ADD COLUMN profile_pending_by TEXT;
ALTER TABLE vendor_master ADD COLUMN profile_reviewed_by TEXT;
ALTER TABLE vendor_master ADD COLUMN custom_fields TEXT;

-- 幂等守卫（version 为 TEXT 主键）
INSERT INTO schema_migrations (version, applied_at) VALUES ('0017_vendor_master_ext', datetime('now'))
ON CONFLICT(version) DO NOTHING;
