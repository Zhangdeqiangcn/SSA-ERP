-- ═══════════════════════════════════════════════════════════════════════════
-- 0115 采购员定向邀请供应商注册（V3.100.0）
-- ───────────────────────────────────────────────────────────────────────────
-- 背景（强哥诉求）：让采购员生成专属邀请链接，供应商凭链接注册后自动归属到
--   该采购员，并由其审核（定向邀请 + 弱定向审核）。
-- 设计：
--   · vendor_invitations：邀请记录表。owner_id = 发起采购员 id（RLS 'own'，
--     保证采购员只看见自己发的邀请；admin/super 特权绕过看全部）。
--   · buyer_id / buyer_name：冗余记录发起采购员，注册落库时作为定向归属依据。
--   · code：全局唯一的邀请码（公开链接用，无需登录即可凭码查询/注册）。
--   · status：active / used / revoked；used_at 标记被消费；expires_at 可空=永久。
--   · 范式沿用 0109 flow_shared 审计列（created_at/created_by/...）。
-- 幂等：CREATE TABLE / 唯一索引均带 IF NOT EXISTS，重复执行安全。
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_invitations (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL DEFAULT 'default',
  code            TEXT NOT NULL,                     -- 邀请码（公开链接用，全局唯一）
  buyer_id        TEXT,                              -- 发起邀请的采购员 id
  buyer_name      TEXT,                              -- 发起邀请的采购员姓名（冗余快照）
  sales_org       TEXT,                              -- 采购组织（邀请时指定，注册申请路由到该条线）
  status          TEXT DEFAULT 'active',             -- active / used / revoked
  expires_at      TEXT,                              -- 过期时间（NULL=永久有效）
  used_at         TEXT,                              -- 使用时间（被注册消费时写）
  owner_id        TEXT,                              -- 行级归属（RLS 'own' 用，= buyer_id）
  created_at      TEXT,
  updated_at      TEXT,
  created_by      TEXT,
  updated_by      TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_invitations_code ON vendor_invitations(code);

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0115_vendor_invitations', datetime('now'))
ON CONFLICT(version) DO NOTHING;
