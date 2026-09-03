-- 迁移 0019：serial_movements 补 created_at / created_by 审计列
-- 根因：W1-B1 的 insertSerialMovement（functions/_shared/serial.ts）向 serial_movements 写入
--       created_at + created_by，但迁移 0010 建表时漏了这两列，导致生产/本地 serial POST/PUT 带
--       movement 时 D1 报 `table serial_movements has no column named created_at`（500）。
--       本地 E2E 校验（scripts/w1b1-local-e2e.mjs）于 2026-09-03 捕获该真实缺陷。
-- 此处补齐列，与 insertSerialMovement 的 INSERT 列严格对齐。SQLite ALTER 不支持 IF NOT EXISTS，
-- 由 wrangler migrations 状态机保证仅执行一次（schema_migrations 已登记 0001-0018）。

ALTER TABLE serial_movements ADD COLUMN created_at TEXT;
ALTER TABLE serial_movements ADD COLUMN created_by TEXT;
