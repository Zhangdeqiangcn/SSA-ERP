-- 0060_purchase_unique_index.sql
-- 采购域：补上 0058 漏建的业务单号唯一约束（V3.11.0）
--
-- ═══════════════════ 这个迁移为什么存在 ═══════════════════
--
-- 0058 建 `purchase_requests` 时，只建了三个**普通**索引：
--   idx_purchase_requests_no / _status / _status_pri
-- 而 0051（BOM）、0056（审批流）等前序域的同类表都带了 UNIQUE 约束。
--
-- 但 `functions/_shared/purchaseConfig.ts` 与
-- `functions/_shared/parentChild.ts` 的代码**都假定它存在**：
--   · 配置里写明「noCamel 取 requestNo：UNIQUE 约束落在业务单号上」
--   · parentChild 的 pcCreate / pcUpdate 各有一段
--     `if (String(e?.message||'').includes('UNIQUE')) return 409`
-- 少了唯一约束，那两段 409 分支**永远不会触发** ——
-- 结果是「同一张申请单可以被建两次、单号完全相同」，
-- 没有任何报错，用户与审批人都以为只是一张单。
--
-- ★★ 为什么这个缺陷「类型检查与打包都发现不了」：
--    表名与列名在 SQL 字符串里，编译器看不到；
--    唯一约束是**数据库层**的事实，代码侧只能靠「假设它存在」。
--    唯一的发现方式是**真的建一条重复记录试试** —— 这正是
--    `suites/22-purchase-domain.mjs` 里那条断言的作用
--    （首轮跑出「重复 request_no 被拒（409）」失败 status=201）。
--
-- ★ 这也是本项目第一次出现「配置文件的注释与迁移脚本的实际内容不一致」：
--   写配置时我按「应该有的样子」写了注释，但没有回去核对迁移是否真的建了。
--   与 0053 的教训同源 —— **按「应该长什么样」推断，而不是按「实际是什么」核对**。
--
-- ═══════════════════ 为什么用 UNIQUE INDEX 而不是重建表 ═══════════════════
--
-- SQLite 不支持给已存在的表 ALTER 加 UNIQUE 约束；
-- 严格做法是「建新表 → 搬数据 → 删旧表 → 改名」。
-- 但这里可以用**等价且零风险**的做法：`CREATE UNIQUE INDEX`。
-- 二者在约束语义上完全一致（冲突时报 `UNIQUE constraint failed`，
-- 错误信息里同样含 "UNIQUE"，parentChild 的 409 分支照样命中），
-- 却不需要搬动任何一行数据。**在有真实数据的表上，能不改结构就不改结构。**
--
-- ═══════════════════ 前提核对（动手前已做）═══════════════════
--
-- 建唯一索引会在「已有重复值」时失败。执行本迁移前已核对生产库：
--   SELECT request_no, COUNT(*) FROM purchase_requests
--    GROUP BY org_id, request_no HAVING COUNT(*) > 1;   → 0 行
-- 即存量 5 条申请的单号互不重复，索引可以安全建立。
-- **这一段核对不能省** —— 若存量已有重复，必须先决定留哪一条，
-- 而那是业务决策，不该由迁移脚本擅自处理。

-- ── 采购申请：同组织内业务单号唯一 ──────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uniq_purchase_requests_no
  ON purchase_requests(org_id, request_no);

-- ── 供应商报价：同组织 + 同申请 + 同供应商 只应有一份报价 ────────
-- 语义说明：一张申请单可以有多家供应商报价（这正是「比价」），
-- 但**同一家供应商对同一张申请单重复报价**是数据错误 ——
-- 会让比价列表里出现两条同一供应商的记录，采购员无从判断哪条是新的。
-- 注意这是「业务复合键」，其 camel 对应关系不是单一字段，
-- 因此 parentChild 的 409 提示（取 noCamel=vendorName）在这里只是兜底文案，
-- 真正的防重靠本索引。若将来需要更精确的提示，可再单独处理。
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vendor_quotes_req_vendor
  ON vendor_quotes(org_id, request_id, vendor_id);

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0060_purchase_unique_index', datetime('now'))
ON CONFLICT(version) DO NOTHING;
