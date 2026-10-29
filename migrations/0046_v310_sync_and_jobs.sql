-- V3.1.0 ① 前端持久化可感知失败与冲突检测  ② 后台任务可靠调度
--
-- 来源：《SSA ERP 稳定性·可靠性·安全性深度评测报告》遗留两项架构级问题
--   H-02 云端写入失败被静默吞掉，用户以为是「保存成功」，实际改动丢失；
--   M-13 状态值按「键」整块覆盖，多端并发互相覆盖且无任何提示；
--   H-04 后台任务（安全邮箱延时投递）依赖「恰好有人访问」才顺带触发，
--        投递时间不可控，且过程无留痕、失败无法观测与重放。
--
-- 本迁移只做「数据结构的支撑」：
--   1) app_state 增加版本号，供前端写入时做乐观并发比对（冲突 → 409 提示，而非静默覆盖）；
--   2) 新建两张留痕表，让任务执行「可观测、可统计、可重放」；
--   3) 登记外部调度所需的配置项（令牌 / 周期 / 开关），运维可在库中直接调整。
--
-- 说明：D1(SQLite) 不支持 ADD COLUMN IF NOT EXISTS；本迁移由 wrangler 按文件名登记，
--   成功后自动跳过，重复 apply 不会重复执行。

-- ── 1) 业务状态键值：增加版本号（乐观并发控制）──────────────────
-- version 语义：每次成功写入 +1。前端写入时带上「上次读到的版本号」，
--   若库中版本已变，说明期间有别人改动过，返回 409 让前端提示，而不是直接覆盖。
--   历史行统一从 1 开始（默认值），不影响既有读取。
ALTER TABLE app_state ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE app_state ADD COLUMN updated_by TEXT;

-- ── 2) 任务推进留痕：每一次「推进动作」一行 ────────────────────
-- 用途：回答「后台任务到底有没有被触发过、什么时候、结果如何」。
--   source=scheduler  外部定时调度（推荐的主要触发方式）
--   source=middleware 任意接口请求顺带触发（兜底）
--   source=manual     管理员在安全中心手动点「立即推进」
--   source=login      登录时触发（保证用户主动来查时功能不失效）
CREATE TABLE IF NOT EXISTS job_ticks (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  status      TEXT NOT NULL,          -- ok | failed
  processed   INTEGER NOT NULL DEFAULT 0,
  sent        INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error       TEXT,
  started_at  TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_ticks_started ON job_ticks(started_at);

-- ── 3) 任务尝试留痕：每一次真实执行一行（支持重放与排障）────────
CREATE TABLE IF NOT EXISTS job_runs (
  id          TEXT PRIMARY KEY,
  job_type    TEXT NOT NULL,          -- security_mail（安全邮箱延时投递）
  ref_id      TEXT NOT NULL,          -- 对应 security_mail_queue.id
  attempt     INTEGER NOT NULL,       -- 第几次尝试
  status      TEXT NOT NULL,          -- ok | failed
  target      TEXT,                   -- 收件方（脱敏前的投递目标，排障用）
  error       TEXT,
  started_at  TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_runs_ref ON job_runs(job_type, ref_id, attempt);

-- ── 4) 外部调度配置（运维可在数据库直接调整，无需重新部署）──────
-- jobs.tick_token        外部调度令牌：定时任务在请求头带 X-Job-Token 调用推进接口。
--                        首次部署时若不存在，用随机值自动生成（32 位十六进制）。
-- jobs.tick_interval_min 建议的调度周期（分钟），仅作为提示与脚本默认值，不强制。
-- jobs.tick_enabled      是否允许外部调度触发（置 0 可一键停用外部调度）。
INSERT INTO system_config (key, value, updated_at)
SELECT 'jobs.tick_token', lower(hex(randomblob(16))), datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM system_config WHERE key = 'jobs.tick_token');

INSERT INTO system_config (key, value, updated_at) VALUES
  ('jobs.tick_interval_min', '10', datetime('now')),
  ('jobs.tick_enabled',      '1',  datetime('now'))
ON CONFLICT(key) DO NOTHING;

-- ── 5) 幂等守卫（业务版本登记）──────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0046_v310_sync_and_jobs', datetime('now'))
ON CONFLICT(version) DO NOTHING;
