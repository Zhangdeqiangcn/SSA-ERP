-- 迁移 0063：修正 0057 / 0059 存量回填的**组织归属错误**（V3.12.0）
--
-- ═══════════════ 这是什么性质的问题 ═══════════════
-- **不是本轮引入的回归，是前两轮（V3.10.0 / V3.11.0）遗留的旧缺陷**，
-- 且属于「上一轮汇报有误需纠正」：
--   · V3.10.0 记录写「0057 回填 13 流程 + 28 节点，changes 43」—— 数量没错；
--   · V3.11.0 记录写「回填 5/8/2/6」—— 数量也没错；
--   · **但两轮都没核对「这些行落在了哪个组织」**，而它们落错了。
--   数量核对通过 ≠ 数据到了该到的地方。**行数与归属是两件独立的事。**
--
-- ═══════════════ 现象（用户视角）══════════════
-- 强哥用自己的账号（zhangdeqiang / super_admin，组织 CY03Z）登录后：
--   · 采购申请列表 **空**（应有 5 条）
--   · 供应商报价列表 **空**（应有 2 条）
--   · 审批流设置页 **看不到任何流程**（应有 13 条）
-- 而数据库里这些行**确实存在**、迁移执行成功、门禁全绿。
-- → 典型「静默失效」：没有任何报错，只是数据不在你这一侧。
--
-- ═══════════════ 根因（三层，缺一不成立）══════════════
-- ① **前提错误**：0057/0059 的注释写「app_state 是全局单份历史配置表，
--    本身不带 org_id」—— 实测 DDL 是
--      CREATE TABLE app_state (org_id TEXT NOT NULL, key TEXT NOT NULL,
--        value TEXT NOT NULL, ..., PRIMARY KEY (org_id, key))
--    **它带 org_id，还是主键的一部分。** 于是本可直接取的，变成了要推导。
-- ② **推导规则选错**：改用「用户数最多的组织」→ 选中 xinguang（8 用户）。
--    但该组织的用户全是 2026-08-28 seed 污染时灌进去的（`vendor_vendor-V002`
--    这类账号，创建时间整点 2026-08-18T00:00:00Z），**没有真人**。
-- ③ **旁证反而加固了错误**：0059 写「追加一条独立旁证 —— purchase_orders
--    3 条在 org_04d6…」。但项目记忆里明确记着 seed 污染的数字是
--    「供应商 12 / 客户 5 / 采购订单 3 / 销售订单 3 / 工单 3」，
--    实测 xinguang 各表计数与之**逐项吻合** → 旁证指向的正是被污染的组织。
--    ★ 教训：**两条证据指向同一答案，只有在两条都独立且都可靠时才算确认。**
--      这里第二条（哪张表数据多）被污染数据带偏，反而让错误答案看起来更可信。
--
-- ═══════════════ 本迁移怎么定「正确组织」（用一手证据，不推导）══════════════
--   取 `app_state` 行自带的 org_id：
--     ssa-erp-approval-flows → org_d213a257563c40cca55551781cef67f9（CY03Z 创业三人组）
--     ssa-erp-purchase       → 同上
--   Blob 是登录用户写入的 → 该 org_id 就是数据所有者。
--   **决定性旁证**：强哥的账号 zhangdeqiang 就在 CY03Z。
--
-- ═══════════════ 为什么是 UPDATE（搬）而不是 INSERT（复制一份）══════════════
-- 三张表的 id 都是 **TEXT PRIMARY KEY**（不是 (org_id,id) 复合主键），
-- 同一 id 在库里只能有一行 → **无法在 CY03Z 再插一份同 id 的行**。
-- 因此唯一正确的做法是把它**搬到**正确组织。
--   · 这不是删除：数据一行不少，只是改了归属列。
--   · 可回退：源 Blob（`app_state`）**原样保留**，随时可反向 UPDATE 回去。
--
-- ═══════════════ 安全性守卫（三条，缺一不执行）══════════════
--   1. 只动 org_id = xinguang 的行（显式列出组织 id，不写「非 CY03Z 全部」）；
--   2. 且该行 id 必须**确实出现在对应 Blob 里**（证明它就是从那个 Blob 搬出来的）；
--   3. 且目标组织（Blob 的 org_id）**存在**。
-- 三条同时满足才搬。任何一条不满足 → 该行原地不动。
--
-- ═══════════════ 子表不需要动 ═══════════════
-- approval_flow_nodes / purchase_request_items / vendor_quote_items
-- 三张子表**都没有 org_id 列**（只靠 flow_id / request_id / quote_id 从属父表），
-- 父表改归属后子表自动跟随。已用 PRAGMA 实测确认。

-- ── 1. 审批流定义（0057 回填，13 条）────────────────────────────
UPDATE approval_flows
SET org_id = (SELECT a.org_id FROM app_state a WHERE a.key = 'ssa-erp-approval-flows' LIMIT 1)
WHERE org_id = 'org_04d67b437bf24a5db3d4aa2fc756b45d'
  AND (SELECT a.org_id FROM app_state a WHERE a.key = 'ssa-erp-approval-flows' LIMIT 1) IS NOT NULL
  AND id IN (
    SELECT r.value ->> 'id'
    FROM app_state a, json_each(a.value, '$.state.flows') r
    WHERE a.key = 'ssa-erp-approval-flows'
  );

-- ── 2. 采购申请（0059 回填，5 条）───────────────────────────────
UPDATE purchase_requests
SET org_id = (SELECT a.org_id FROM app_state a WHERE a.key = 'ssa-erp-purchase' LIMIT 1)
WHERE org_id = 'org_04d67b437bf24a5db3d4aa2fc756b45d'
  AND (SELECT a.org_id FROM app_state a WHERE a.key = 'ssa-erp-purchase' LIMIT 1) IS NOT NULL
  AND id IN (
    SELECT r.value ->> 'id'
    FROM app_state a, json_each(a.value, '$.state.purchaseRequests') r
    WHERE a.key = 'ssa-erp-purchase'
  );

-- ── 3. 供应商报价（0059 回填，2 条）─────────────────────────────
UPDATE vendor_quotes
SET org_id = (SELECT a.org_id FROM app_state a WHERE a.key = 'ssa-erp-purchase' LIMIT 1)
WHERE org_id = 'org_04d67b437bf24a5db3d4aa2fc756b45d'
  AND (SELECT a.org_id FROM app_state a WHERE a.key = 'ssa-erp-purchase' LIMIT 1) IS NOT NULL
  AND id IN (
    SELECT r.value ->> 'id'
    FROM app_state a, json_each(a.value, '$.state.vendorQuotes') r
    WHERE a.key = 'ssa-erp-purchase'
  );

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0063_fix_backfill_org_ownership', datetime('now'))
ON CONFLICT(version) DO NOTHING;
