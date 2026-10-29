-- W1 根治双通道：采购订单补 version / history 列，支撑 B10 变更单版本留痕落 D1。
-- SQLite 不支持 `ALTER TABLE ADD COLUMN IF NOT EXISTS`，故本文件幂等由「应用前先探测列是否存在」保证
-- （见实施脚本：PRAGMA table_info 探测，仅当列不存在才执行 ALTER；重复应用安全）。
-- 远程应用：wrangler d1 execute --remote --command "$(cat migrations/0020_purchase_order_version.sql)"

PRAGMA foreign_keys = ON;

ALTER TABLE purchase_orders ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE purchase_orders ADD COLUMN history TEXT DEFAULT '[]';

INSERT INTO schema_migrations (version, applied_at) VALUES ('0020_purchase_order_version', datetime('now')) ON CONFLICT(version) DO NOTHING;
