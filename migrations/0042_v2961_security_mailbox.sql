-- V2.96.1 安全邮箱备用通道（带时延、不依赖登录态的异地取码路径）
-- 需求来源（强哥指令）：
--   原设计「在安全中心用登录密码查看最近生成的验证码」被否决——能登录系统就能看到验证码，
--   等于这条后路没有提供任何额外隔离。改为：另设一个与登录体系无关的「安全邮箱」，
--   当双邮箱通道取不到码时，可申请把新的一批验证码「延后投递」到安全邮箱，
--   并在间隔一段时间后再投递一次（防止首次丢信）。
--
-- 设计要点：
--   · 验证码全程不在系统任何界面出现，彻底解决「能登录就能看码」的问题；
--   · 8 小时时延 = 攻击者即使拿到登录密码，也必须在 8 小时后仍能进入安全邮箱才可能得手；
--   · 延时/间隔/次数均为可配置项，运维可在数据库直接调整，无需重新部署；
--   · Cloudflare Pages Functions 没有定时任务能力，故采用「懒执行」：
--     任何请求到来时顺带检查是否有到期任务并投递（详见 functions/_middleware.ts）。
--
-- 说明：D1(SQLite) 不支持 ALTER TABLE ... ADD COLUMN IF NOT EXISTS；本迁移由
--   `wrangler d1 migrations apply` 执行并记录，成功后自动跳过，重复 apply 不报错。

-- ── 1) 安全邮箱投递队列 ─────────────────────────────────────────
-- 一次「申请备用通道」= 1 行；同一用户同一用途同时只允许存在 1 行未完成记录。
CREATE TABLE IF NOT EXISTS security_mail_queue (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  username     TEXT,
  purpose      TEXT NOT NULL,          -- activate | change_password
  mailbox      TEXT NOT NULL,          -- 安全邮箱（收件方，与发件账号无关）
  codes        TEXT NOT NULL,          -- JSON 数组，本批次的 2 枚验证码
  batch_id     TEXT NOT NULL,          -- 投递时写入 email_verifications 用的批次号
  delay_hours  INTEGER NOT NULL DEFAULT 8,
  interval_min INTEGER NOT NULL DEFAULT 10,
  max_attempts INTEGER NOT NULL DEFAULT 2,
  attempt      INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | done | failed | cancelled
  deliver_at   TEXT NOT NULL,          -- 下次投递时间
  last_error   TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_sec_mail_queue_due
  ON security_mail_queue(status, deliver_at);
CREATE INDEX IF NOT EXISTS idx_sec_mail_queue_user
  ON security_mail_queue(user_id, purpose, created_at);

-- ── 2) 安全邮箱相关配置（运维可在库中直接调整）───────────────────
-- security.mailbox      安全邮箱地址（收件方）。留空 = 该通道不可用。
-- security.delay_hours  申请后延迟多少小时才投递（默认 8，即强哥指定值）
-- security.interval_min 首次投递后间隔多少分钟再投递一次（默认 10）
-- security.max_attempts 最多投递几次（默认 2）
INSERT INTO system_config (key, value, updated_at) VALUES
  ('security.mailbox',      'zhang.deqiang@foxmail.com', datetime('now')),
  ('security.delay_hours',  '8',                         datetime('now')),
  ('security.interval_min', '10',                        datetime('now')),
  ('security.max_attempts', '2',                         datetime('now'))
ON CONFLICT(key) DO NOTHING;

-- ── 3) 幂等守卫（业务版本登记）──────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0042_v2961_security_mailbox', datetime('now'))
ON CONFLICT(version) DO NOTHING;
