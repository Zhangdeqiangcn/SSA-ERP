-- 迁移 0067：为 fin_project_accounts 补 (org_id, account_no) 唯一约束
--
-- ═══════════════ 背景 ═══════════════
-- 审计报告 DB-008 指出：fin_project_accounts（项目核算科目映射）缺少唯一约束，
-- 同一组织下可重复录入相同 account_no，导致项目核算数据出现重复行、汇总失真。
-- 修复前已在线上执行查重：
--   SELECT org_id, account_no, COUNT(*) FROM fin_project_accounts
--   GROUP BY org_id, account_no HAVING COUNT(*)>1;
-- 返回 0 行 → 线上无重复数据，可安全建唯一索引。
--
-- ═══════════════ 修复 ═══════════════
-- 在 (org_id, account_no) 上建唯一索引，杜绝跨组织重复录入。
-- 索引名统一前缀 uniq_，与 0060 等既有唯一索引风格一致。

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fin_project_accounts_no
  ON fin_project_accounts(org_id, account_no);

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0067_fin_project_accounts_unique', datetime('now'))
ON CONFLICT(version) DO NOTHING;
