-- W1 根治双通道：vouchers 表补 created_by 审计列
-- 原 0007_p1_phase5.sql 的 vouchers DDL 仅含 created_at/updated_at/updated_by，
-- 缺 created_by；而 vouchers POST 端点（functions/api/vouchers/index.ts）写入
-- created_by / updated_by，导致 INSERT 500。本迁移补齐该列，与 purchase_orders /
-- sales_orders / work_orders 保持一致（均为可空 TEXT）。
PRAGMA foreign_keys = ON;

ALTER TABLE vouchers ADD COLUMN created_by TEXT;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0022_vouchers_created_by', datetime('now'))
ON CONFLICT(version) DO NOTHING;
