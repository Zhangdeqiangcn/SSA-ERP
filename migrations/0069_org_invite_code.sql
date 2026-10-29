-- 迁移 0069：公司邀请码（有效期 / 轮换 / 停用）+ 已吊销邀请码历史
--
-- ═══════════════ 背景 ═══════════════
-- 原设计：orgs.company_code 由注册者自行填写、永久有效、不可更换，且兼任「公司身份」与
--   「加入凭证」两个职责。业务需求变更为：
--     1) 邀请码由公司管理员设置；2) 有有效期（默认 30 天，可自定义或永久）；
--     3) 可定期更换，旧码立即失效；4) 加入仍需管理员审批（保持现有安全级别）。
--   为让邀请码可更换而公司身份不变，本迁移把「公司身份」与「加入凭证」解耦：
--     公司身份由 orgs.id / orgs.name 承载；company_code 降级为可轮换的「邀请码」。
--
-- ═══════════════ 变更内容 ═══════════════
-- ① orgs 增加三列：
--      code_expires_at  邀请码到期时间（ISO 字符串；NULL = 永久有效）
--      code_rotated_at  最近一次轮换/更换时间（ISO 字符串；NULL = 从未更换）
--      code_disabled    是否暂停接受新成员加入（0 = 正常，1 = 停用）
--   老数据回填语义：code_expires_at = NULL（永久），code_disabled = 0（正常）
--   —— 即历史组织保持「永久有效、可加入」，不会因本次变更被锁死。
-- ② 新增 org_code_history 表：记录被更换/吊销的旧邀请码，用于注册时识别「旧码」并明确
--   拒绝（提示「邀请码已失效」），避免旧码被误判为「新公司」而建出重复组织。
--
-- 兼容性：纯新增列 + 新增表，不改动既有列与数据；全新库与现有生产库均可安全执行。

-- ── ① orgs 新增列 ────────────────────────────────────────────
ALTER TABLE orgs ADD COLUMN code_expires_at TEXT;
ALTER TABLE orgs ADD COLUMN code_rotated_at TEXT;
ALTER TABLE orgs ADD COLUMN code_disabled INTEGER NOT NULL DEFAULT 0;

-- ── ② 已吊销邀请码历史表 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_code_history (
  code        TEXT PRIMARY KEY,   -- 已吊销的旧邀请码（全局唯一，防止被再次使用）
  org_id      TEXT NOT NULL,      -- 该码原属组织
  revoked_at  TEXT NOT NULL,      -- 吊销时间（ISO）
  revoked_by  TEXT                -- 吊销操作人（用户 id）
);
CREATE INDEX IF NOT EXISTS idx_org_code_history_org ON org_code_history(org_id);

-- ── 登记迁移版本（幂等）──────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0069_org_invite_code', datetime('now'))
ON CONFLICT(version) DO NOTHING;
