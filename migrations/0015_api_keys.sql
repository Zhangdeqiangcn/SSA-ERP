-- 迁移 0015：开放 API 网关密钥表
-- 对外端点用 API Key 鉴权（非 session），支持 scope 与限流。
CREATE TABLE IF NOT EXISTS api_keys (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,        -- 明文 key 仅展示一次，存 SHA-256
  label      TEXT,
  scopes     TEXT NOT NULL DEFAULT 'read', -- 'read' | 'read,write'
  created_by TEXT,
  revoked    INTEGER NOT NULL DEFAULT 0,
  rate_limit INTEGER NOT NULL DEFAULT 60,  -- 每窗口(60s)最大请求数
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
