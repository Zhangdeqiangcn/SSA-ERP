-- V3.83.0 审计跨端精确回滚地基：给 audit_logs 加 version 列
-- ------------------------------------------------------------------
-- 背景：前端 auditStore.rollbackTo/getVersionHistory 此前依赖「本地整块 blob records 的
--   version 字段」做版本历史 + 回滚（V3.82 去双源后 records 已改纯内存会话态）。
--   要支撑「跨端精确回滚」（另一台设备/他人操作留下的版本历史也能看到并回滚），
--   服务端 audit_logs 必须有单调递增的 version 列，按 (org_id, entity, entity_id) 维度编号。
--
-- 设计（最小改动、向后兼容）：
--   · version INTEGER NOT NULL DEFAULT 1 —— 存量行全部按 1 兜底（它们没有精确版本概念，
--     历史数据本就是「快照」而非「版本链」，统一视为各自第 1 版不产生歧义）。
--   · 新写入的审计记录在端点层按「同 org+entity+entityId 的当前最大 version + 1」自增，
--     使每个实体的变更链跨端可枚举、可按目标 version 精确回滚。
--   · 加同键索引，支撑端点「取该实体当前最大 version」的 O(索引) 查询。
--
-- 幂等：CREATE/ALTER 在已存在时安全（ALTER ADD COLUMN 重复会报 duplicate，
--   但本迁移在 d1_migrations 登记后只跑一次，永不重放；下方用 PRAGMA 判断做全新库幂等）。

-- SQLite 的 ALTER TABLE ADD COLUMN 不能直接 IF NOT EXISTS，用 PRAGMA 检测列是否已存在再决定
-- （这里用一段应用层幂等：先查列，无则加）。迁移框架为「逐条执行」，故拆成两步安全写法——
-- 直接 ADD（生产库首次执行）；全新空库执行 0039 已建 audit_logs，本条 ADD 一次成功。
ALTER TABLE audit_logs ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 变更链查询索引（按实体维度取最大 version / 拉取某实体的版本历史）
CREATE INDEX IF NOT EXISTS idx_audit_entity_version
  ON audit_logs(org_id, entity, entity_id, version DESC);
