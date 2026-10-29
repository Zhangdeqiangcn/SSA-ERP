-- V2.96.0 超级管理员双邮箱双重验证 · 新公司码注册审批 · 系统邮件通知
-- 需求来源（强哥指令）：
--   1) 超级管理员绑定主邮箱 + 抄送邮箱；首次登录须两个邮箱的验证码「分别发送、同时通过」
--      后方可登录并设置密码；修改密码同样要求双邮箱验证；
--      系统版本升级等重大事件以邮件通知到该两个邮箱。
--   2) 注册策略调整：新公司码的首个注册者不再直接可用，须经超级管理员批准后方可进入系统；
--      批准后授予该公司管理员权限（仅能管理本公司事务，不能跨公司）。
-- 说明：D1(SQLite) 不支持 ALTER TABLE ... ADD COLUMN IF NOT EXISTS；本迁移由
--   `wrangler d1 migrations apply` 执行并记录，成功后自动跳过，重复 apply 不报错；
--   另在 schema_migrations 表登记业务版本号作为双保险（与 0039/0040 同一约定）。

-- ── 1) 组织：审批状态 ─────────────────────────────────────────────
-- active  正常启用（历史存量组织沿用默认值，升级后行为不变）
-- pending 由新公司码首注册者创建，等待超级管理员批准后方可启用
ALTER TABLE orgs ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE orgs ADD COLUMN created_by TEXT;

-- ── 2) 用户：抄送邮箱 + 安全初始化标记 ────────────────────────────
-- alt_email            备用（抄送）邮箱，与 email 共同构成双邮箱验证通道
-- security_initialized 1=安全信息已就绪（历史账号默认 1，升级后不受影响）
--                      0=待首次激活：登录时须完成双邮箱验证并设置密码
ALTER TABLE users ADD COLUMN alt_email TEXT;
ALTER TABLE users ADD COLUMN security_initialized INTEGER NOT NULL DEFAULT 1;

-- ── 3) 系统配置（key-value）──────────────────────────────────────
-- 存放邮件服务配置等运行期可改参数，改配置无需重新部署
CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT
);

-- ── 4) 邮箱验证码 ────────────────────────────────────────────────
-- 一次「发送验证码」动作按收件邮箱各生成 1 行（超管为 2 行，两枚验证码互相独立）；
-- 校验规则：同一 batch_id 下全部行 verified=1 才算通过。
CREATE TABLE IF NOT EXISTS email_verifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  username   TEXT,
  purpose    TEXT NOT NULL,          -- activate | change_password
  email      TEXT NOT NULL,          -- 收件邮箱（回传前端时脱敏显示）
  code       TEXT NOT NULL,          -- 6 位数字验证码
  batch_id   TEXT NOT NULL,          -- 同一次发送的批次号，多邮箱共享
  attempts   INTEGER NOT NULL DEFAULT 0,
  verified   INTEGER NOT NULL DEFAULT 0,
  consumed   INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_verif_batch ON email_verifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verifications(user_id, purpose, created_at);

-- ── 5) 邮件发送日志 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mail_logs (
  id         TEXT PRIMARY KEY,
  topic      TEXT,                   -- verification | version_notice | test
  to_addr    TEXT,
  subject    TEXT,
  status     TEXT,                   -- sent | failed
  error      TEXT,
  batch_id   TEXT,
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_mail_logs_created ON mail_logs(created_at);

-- ── 6) 一次性安全凭证（双邮箱验证通过后签发）───────────────────
-- 验证码校验通过 → 签发 ticket；激活/改密接口凭 ticket 放行一次，用后作废。
-- 作用：把「验证通过」与「设置密码」两步解耦，避免验证码被重复使用。
CREATE TABLE IF NOT EXISTS security_tickets (
  ticket     TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  purpose    TEXT NOT NULL,          -- activate | change_password
  used       INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_security_tickets_user ON security_tickets(user_id, purpose);

-- ── 7) 邮件服务初始配置（授权码等敏感值由部署后写入）─────────────
INSERT INTO system_config (key, value, updated_at) VALUES
  ('mail.enabled',           '0',                datetime('now')),
  ('mail.smtp_host',         'smtp.163.com',     datetime('now')),
  ('mail.smtp_port',         '465',              datetime('now')),
  ('mail.smtp_secure',       'on',               datetime('now')),
  ('mail.smtp_user',         '',                 datetime('now')),
  ('mail.smtp_pass',         '',                 datetime('now')),
  ('mail.from_name',         'SSA ERP 系统通知',  datetime('now')),
  ('mail.notify_recipients', '',                 datetime('now')),
  ('security.super_admin_emails', '',            datetime('now'))
ON CONFLICT(key) DO NOTHING;

-- ── 8) 幂等守卫（业务版本登记）──────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0041_v296_security', datetime('now'))
ON CONFLICT(version) DO NOTHING;
