-- ═══════════════════════════════════════════════════════════════════════════
-- 0097 多组织编号隔离：numbering_rules 自然键 docType → org_id::doc_type
-- ───────────────────────────────────────────────────────────────────────────
-- 背景（V3.67.0 立项① 遗留）：numbering_rules 主键 id = docType（全局自然键），
-- RLS 虽按 org_id 隔离查询，但主键本身是全局的——组织 A 建过 PO 行后，
-- 组织 B 查无本组织行 → INSERT 新行撞全局主键 'PO' → 取号 503。
-- 本迁移把自然键改为「组织+单据类型」复合键（id = org_id || '::' || doc_type），
-- 序号天然按组织分开，多组织各自独立取号互不干扰。
--
-- 数据迁移（幂等）：把存量「旧格式 id」（= 裸 docType，无 '::' 前缀）的行
-- 改名为 org_id::doc_type。生产库当前该表为空（0095 建表后尚未产生数据），
-- 此 UPDATE 只是前瞻性兜底——真出现旧格式行也能一次跑通，不依赖人工。
-- WHERE 条件保证只改「旧格式行」，新格式行（已带 '::'）不动，可重复执行。
-- ═══════════════════════════════════════════════════════════════════════════

-- ① 旧格式行改名：id = 裸 docType（doc_type 列 = id 自身，说明没带组织前缀）
UPDATE numbering_rules
SET id = org_id || '::' || doc_type
WHERE id NOT LIKE '%::%'
  AND doc_type = id;

-- ② 兜底：若上面因 doc_type 为 NULL 漏改，按 id 形态再补一次（id 无 '::' 的旧行）
--    与 ① 等价但覆盖 doc_type 缺失的边界行；两语句都幂等，重复执行无副作用。
UPDATE numbering_rules
SET id = COALESCE(org_id, 'dev') || '::' || COALESCE(doc_type, id)
WHERE id NOT LIKE '%::%';
