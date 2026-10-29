-- 迁移 0047：开放网关 API Key 生命周期（有效期 + 轮换留痕）
-- 来源：独立安全评测（V2.97.0 基线）发现 M-12「接口密钥无有效期、支持网址参数传递」/ L-02「密钥无轮换机制」
-- 整改版本：V3.2.0
--
-- 设计取舍（三条，均以「不打断既有集成」为前提）：
--   1) expires_at 允许为空 = 永久有效 —— 迁移前已签发的历史 Key 不强制过期，
--      避免上线瞬间把线上集成全部切断；新建 Key 默认 90 天，可显式选永久。
--   2) rotated_at 记录最近一次轮换时间 —— 轮换采用「原地替换密钥哈希」而非新建一行：
--      调用方只需替换密钥字符串，Key 的编号、标签、权限、限流与审计归属全部保持不变，
--      被替换掉的旧密钥在同一时刻失效（因为它已不在表内）。
--   3) 有效期判定放在网关鉴权入口（functions/_shared/apiKey.ts），
--      与吊销判定同一处，确保所有 /api/open/* 端点口径一致，不依赖各端点自觉。
ALTER TABLE api_keys ADD COLUMN expires_at TEXT;
ALTER TABLE api_keys ADD COLUMN rotated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);
