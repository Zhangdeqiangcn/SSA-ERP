-- P1 修复迁移：schema_migrations.version 曾被定义为 INTEGER PRIMARY KEY，
-- 而 0005+ 迁移以文本版本号（如 '0005_purchase_orders'）INSERT，
-- 在 SQLite 中向 INTEGER 主键插入文本会触发 SQLITE_MISMATCH，
-- 导致 0005+ 迁移无法幂等重放（本地/全新库直接失败，远程库靠增量执行侥幸跑过、仅版本记录缺失）。
-- 本迁移将 version 统一改为 TEXT PRIMARY KEY，兼容文本版本号，并保留存量行。
-- 在全新库（0003 已为 TEXT）上运行也安全：仅做一次结构对齐，无副作用。

CREATE TABLE IF NOT EXISTS schema_migrations_new (
  version    TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO schema_migrations_new (version, applied_at)
SELECT CAST(version AS TEXT), applied_at FROM schema_migrations;

DROP TABLE schema_migrations;
ALTER TABLE schema_migrations_new RENAME TO schema_migrations;

-- 记录本迁移版本（此时 schema_migrations 已为 TEXT 主键）
INSERT INTO schema_migrations (version, applied_at) VALUES ('0009_fix_schema_migrations', datetime('now'))
ON CONFLICT(version) DO NOTHING;
