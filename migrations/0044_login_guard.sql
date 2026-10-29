-- 0044：登录失败限流（评测发现 H-05：登录接口无失败次数限制，可被口令爆破）
-- 计数维度 = 用户名 + 来源地址；连续失败达阈值后锁定时长递增。
CREATE TABLE IF NOT EXISTS login_attempts (
  id           TEXT PRIMARY KEY,
  subject_key  TEXT NOT NULL,
  username     TEXT,
  fail_count   INTEGER NOT NULL DEFAULT 0,
  first_fail_at TEXT,
  last_fail_at  TEXT,
  locked_until  TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_login_attempts_subject
  ON login_attempts(subject_key);

CREATE INDEX IF NOT EXISTS idx_login_attempts_locked
  ON login_attempts(locked_until);
