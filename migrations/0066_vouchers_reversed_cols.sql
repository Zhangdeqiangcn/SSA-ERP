-- 迁移 0066：凭证红冲蛇形列 reversed_by / reversed_at 确权
--
-- ═══════════════ 背景（已据线上真实库澄清，修正审计报告 DB-007 的错误前提）═══════════════
-- 审计报告 DB-007 原论断：「迁移 0064 误删了蛇形列 reversed_by / reversed_at，
--   导致红冲流程写这两列时因列不存在而 500，需本迁移补建」。
--
-- 线上真实库查证结论（推翻原论断）：
--   1) 生产 vouchers 表**已存在** snake 列 reversed_by / reversed_at（共 30 列，含该两列）；
--   2) 迁移 0064 仅 DROP 了 9 个**驼峰坏列**（totalDebit/totalCredit/createdBy/reviewedBy/
--      reviewedAt/postedBy/postedAt/reversedBy/reversedAt），从未触及 snake 列；
--   3) snake 列 reversed_by/reversed_at 实际由最早的 0007 建表语句（当时为驼峰写法，
--      后该建表文件被改写为蛇形，但已落地的生产库保留了蛇形列）遗留并保留至今；
--   4) 端点 functions/api/vouchers/index.ts 与 [id].ts 的字段映射
--      reversedBy→reversed_by、reversedAt→reversed_at 均正确，
--      validateOrReject('vouchers',…) 对该两列放行（reversed_by 未在 FIELD_SCHEMA 登记、
--      reversed_at 为 date 类型且接受 ISO 时间戳），不会 500。
--
-- 因此「红冲因缺列而 500」的根因**不成立**：当前生产库列齐全、映射正确、校验放行，
--   红冲流程不会再因缺列触发 500。若线上仍能复现 500，需另查（请提供复现步骤）。
--
-- ═══════════════ 本迁移的处置 ═══════════════
-- 原 ALTER TABLE … ADD COLUMN reversed_by / reversed_at 在线上会因「列已存在」直接报错
--   （duplicate column name: reversed_by），导致 `d1 migrations apply` 中断、连累 0067
--   唯一索引迁移无法下发。
-- 既然列已存在、且 0007 建表已保证其存在（对全新库亦如此），本迁移**不再重复建列**，
--   仅作为「确权/记录」占位，把自身登记进 schema_migrations 以解除部署阻塞，
--   使后续的 0067 唯一索引迁移得以正常 apply。
--
-- 注：本迁移编号取当前最大迁移号 +1（0065 已被 consolidation_multi_ledger 占用）。

-- ── 幂等守卫（仅登记，不做任何 DDL）────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0066_vouchers_reversed_cols', datetime('now'))
ON CONFLICT(version) DO NOTHING;
