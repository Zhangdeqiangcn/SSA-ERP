-- V3.92.0 P1-7：渠道凭证补 OAuth 字段，支撑「登录即连接」授权码流程
-- 设计口径：在既有 channel_credentials 基础上增量加列（密钥 + 令牌 + 刷新 + 状态）。
-- 说明：SQLite 不支持 ADD COLUMN IF NOT EXISTS，本迁移由 wrangler 按 d1_migrations 跟踪只执行一次；
--       若需在已含这些列的库上重放，请先核对（列已存在时 ALTER 会报错，属预期，不影响已应用环境）。
-- 安全：access_token / refresh_token / app_secret 仍由后端持有，绝不落前端。

ALTER TABLE channel_credentials ADD COLUMN refresh_token TEXT;
ALTER TABLE channel_credentials ADD COLUMN scope TEXT;
ALTER TABLE channel_credentials ADD COLUMN auth_mode TEXT;        -- 'oauth' | 'manual'
ALTER TABLE channel_credentials ADD COLUMN status TEXT;          -- 'connected' | 'expired' | 'disconnected'
ALTER TABLE channel_credentials ADD COLUMN shop_id TEXT;
ALTER TABLE channel_credentials ADD COLUMN shop_name TEXT;
ALTER TABLE channel_credentials ADD COLUMN is_mock INTEGER DEFAULT 0; -- 1=模拟授权（未配真实应用密钥）
