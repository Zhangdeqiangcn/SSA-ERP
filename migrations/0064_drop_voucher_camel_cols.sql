-- 迁移 0064：清除 vouchers 表的 9 个驼峰坏列
--
-- ═══════════════ 删哪 9 列 ═══════════════
--   totalDebit  totalCredit  createdBy  reviewedBy  reviewedAt
--   postedBy    postedAt     reversedBy reversedAt
-- 它们与同名蛇形列（total_debit / total_credit / created_by / reviewed_by /
-- reviewed_at / posted_by / posted_at / reversed_by / reversed_at）**语义完全重复**。
-- 成因：早期建表脚本直接照搬前端字段名建列，后来统一走 snake_case，旧列没清。
--
-- ═══════════════ ★ 为什么现在能删：前提核对（不能省）═══════════════
-- 1) 数据核对：vouchers 表**实际 0 行**（脚本 `scripts/_probe_voucher_camel_cols.mjs` 实测）。
--    不存在「驼峰列有值、蛇形列为空」的行 → 删列不会丢任何数据。
--    ★ 若将来重跑本迁移而表内已有数据，必须先跑那个探针确认风险行 = 0。
-- 2) 索引核对：vouchers 上的索引只有
--      idx_vouchers_status(org_id, status) / idx_vouchers_date(org_id, date DESC)
--    **没有任何索引引用这 9 列** → 可以直接 DROP（被索引引用的列删不掉）。
-- 3) 能力核对：D1 的 SQLite 支持 `ALTER TABLE ... DROP COLUMN`
--    （已用临时表实测通过，见探针输出）。
--
-- ═══════════════ ★★ 最关键的一条：先改代码，再删列 ═══════════════
-- `functions/api/vouchers/index.ts` 与 `[id].ts` 的**字段名→列名映射**里，
-- 原本把 totalDebit / createdBy / reviewedBy / postedBy / reversedBy 等
-- 映射成**同名的驼峰数据库列**，而同一张表里
--   attachmentCount → attachment_count、sourceNo → source_no 又是蛇形 ——
-- **一个映射表里混着两套口径**。
-- 如果只删列不改代码，这些字段的读写会指向不存在的列 → **运行时 500**，
-- 且类型检查与打包都发现不了（映射是运行时字符串）。
-- 本迁移的配套代码改动已先于本文件完成（两个端点文件的 colFor/col 映射已统一为蛇形）。
--
-- ★ 顺带修掉一个潜伏缺陷：`createdBy` 原本在 fields 里，而 INSERT 的审计列
--   固定写入 'created_by'，两者同时出现会产生**重复列名**错误。
--   凭证表此前 0 行，所以从未暴露。现已从 fields 移除。
--
-- ═══════════════ 幂等 ═══════════════
-- SQLite 的 DROP COLUMN 没有 IF EXISTS；幂等由 `wrangler d1 migrations apply`
-- 的 d1_migrations 记录保证（已 apply 的迁移自动跳过）。
--
-- ═══════════════ SQL 注释纪律（0060 的教训）══════════════
-- 本文件注释一律 `--`。写 `//` 会让 apply 报 `near "/": syntax error`，
-- 而 `_audit_syntax.mjs` 只解析 .ts 不解析 .sql，抓不到。

ALTER TABLE vouchers DROP COLUMN totalDebit;
ALTER TABLE vouchers DROP COLUMN totalCredit;
ALTER TABLE vouchers DROP COLUMN createdBy;
ALTER TABLE vouchers DROP COLUMN reviewedBy;
ALTER TABLE vouchers DROP COLUMN reviewedAt;
ALTER TABLE vouchers DROP COLUMN postedBy;
ALTER TABLE vouchers DROP COLUMN postedAt;
ALTER TABLE vouchers DROP COLUMN reversedBy;
ALTER TABLE vouchers DROP COLUMN reversedAt;

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0064_drop_voucher_camel_cols', datetime('now'))
ON CONFLICT(version) DO NOTHING;
