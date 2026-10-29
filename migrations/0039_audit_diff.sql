-- V2.93.0 审计日志 D1 真实落库（含 diff 字段）
-- 为 audit_logs 表新增 diff 列，支持变更记录前后快照
--
-- 【V2.96.2 修复】audit_logs 表及其索引此前只存在于生产库（历史手工建表），
--   迁移脚本链中从未包含建表语句，导致「从零重建」执行到本文件时必然失败：
--     X [ERROR] no such table: audit_logs: SQLITE_ERROR
--   现补建该表与全部索引（结构与生产库逐列、逐索引完全一致；共 9 列，
--   diff 列仍由下方 ALTER 追加，以保持与生产库相同的列顺序）。
--   CREATE ... IF NOT EXISTS 保证两种情形都安全：
--     · 全新库：正常建表建索引 → 再由下方 ALTER 追加 diff 列；
--     · 生产库：本迁移已登记于 d1_migrations、永不重放，零影响。

CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  user_id    TEXT,
  user_name  TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  summary    TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_org    ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(org_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(org_id, entity, entity_id);

ALTER TABLE audit_logs ADD COLUMN diff TEXT;
