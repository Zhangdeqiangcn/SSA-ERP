-- SSA ERP 后端初始化
-- 作用域：业务数据按「组织 org_id」共享，同一公司所有人看同一份
-- 账号：按人区分（真实注册/登录/密码哈希/角色）

-- 组织（公司）
CREATE TABLE IF NOT EXISTS orgs (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  company_code  TEXT NOT NULL UNIQUE,   -- 注册时填写，相同 code 即加入同一组织
  created_at    TEXT NOT NULL
);

-- 用户
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  department    TEXT,
  created_at    TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES orgs(id)
);

-- 登录会话
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 业务状态（各 store 的持久化数据，按组织共享）
CREATE TABLE IF NOT EXISTS app_state (
  org_id      TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (org_id, key)
);

CREATE INDEX IF NOT EXISTS idx_app_state_org ON app_state(org_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
