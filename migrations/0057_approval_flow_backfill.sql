-- 迁移 0057：审批流存量数据回填（V3.10.0 · C1）
--
-- ── 为什么需要这个迁移（0056 的一个方案缺口）────────────────────
-- 0056 只建了表，把数据搬运留给前端 store 的 `load()`（「D1 为空则从旧 Blob
-- 回填」）。这个设计在**销售域**行得通，本域**行不通**，原因是本域性质不同：
--   1. 审批流是**配置**，不是流水。空配置 = 所有审批判定全部落空，
--      这不是「等用户下次打开页面就好」的问题。
--   2. 回填依赖「有人恰好打开设置页」。生产 E2E 门禁是**直连接口**跑的，
--      永远不会走浏览器，于是门禁看到的一直是空表（实测 0056 上线后
--      `approval_flows` = 0 行，门禁 21 号套件 3 条断言因此变红）。
--   3. 更根本的一点：D1 里已经有 6799 字节的真实配置（13 条流程 / 28 节点），
--      而它**只存在于 app_state 这张历史表里**。把它留在那儿不动、
--      却让新表长期为空，等于制造了第二个「双源」——
--      正是 C1 这一系列改造要根治的东西。
--
-- → 因此本条迁移**用纯 SQL 完成搬运**，一次性、可复查、不依赖前端。
--   前提已验证：`app_state` 的 value 可被 SQL JSON 函数解析
--   （实测 `json_array_length(value,'$.state.flows')` 返回 13）。
--
-- ── ★ 回填到哪个 org_id（不硬编码，用可复查的推导规则）──────────
-- `app_state` 是**全局单份历史配置表**，本身不携带 org_id
-- （实测除 `ssa-erp-tabs` 外每个业务键只有一份）。因此必须推导目标组织。
-- 推导规则（就写在 SQL 里，可复查）：
--   **取「用户数最多的组织」，并列时取最早创建的那个。**
-- 实测结果唯一：`org_04d67b437bf24a5db3d4aa2fc756b45d`
--   —— 8 个用户（第二名 7 个），最早用户 2026-08-18T00:00:00Z
--   （其余组织均为门禁测试产生的 1 用户组织，创建时间晚数小时）。
-- 为什么不用别的推断方式：
--   · 按销售单数量取 → `sales_orders` 里有**两个**组织都带「种子格式」单号
--     （门禁每轮会造新组织并写入种子），按单据数会取错。
--   · 按 `ssa-erp-org` 取 → 那是**业务组织**（SSA公司 / 武汉工厂 / 新光采购部），
--     与登录租户 `org_id` 是两套完全不同的编号体系，不可混用。
--
-- ── ★ 不删旧 Blob（刻意保留）───────────────────────────────────
-- 本迁移只做「搬到新表」，**不动 app_state 里的旧数据**。理由：
--   ① 其它域（财务/销售）的旧键也都还在，一起删是另一件事，
--      应作为独立的清理动作统一评估，而不是夹在某个域的迁移里顺手做；
--   ② 旧 Blob 是**唯一的原始证据**。一旦发现搬运有偏差，
--      有它在就能逐字段比对、重放；删了就只能靠备份。
--   ③ 迁移的可回退性优先于「少一份冗余」。冗余是暂时的，丢数据是永久的。
-- 清理时机：待全部域迁完、且生产连续多轮门禁全绿后，统一做一次
--   「确认新表与旧 Blob 逐字段一致 → 再删旧键」的收尾。
--
-- ── JSON 列的处理（与 0056 的字段契约严格对应）──────────────────
-- 父表 `visible_roles`、子表 `conditions` / `skip_rule` / `escalation` /
-- `approver_roles` / `approver_user_ids` / `fields` 都是 JSON 文本列。
-- 搬运时**原样取子对象**：`json_extract` 返回的已是合法 JSON 文本
--   （对象给 `{...}`、数组给 `[...]`、缺失给 NULL），
--   **不能再套 json_quote** —— 那会多包一层引号，读回时形状全变。
-- 实测旧数据里实际出现的：conditions 8 次 / escalation 1 次 /
--   approverRoles 1 次 / fields 6 次；skipRule 与 approverUserIds 为 0 次
--   （类型支持但当前未用，仍照常搬运，为将来留位）。
--
-- ── 幂等性 ──────────────────────────────────────────────────────
-- 两条 INSERT 都带 `NOT EXISTS (...)` 守卫，**重复执行安全**：
-- 已搬过的 id 不会重复插入，也不会覆盖用户后来在界面上做的修改。

-- ==================== 1. 父表：13 条审批流 ====================
INSERT INTO approval_flows (
  id, org_id, module, module_label, enabled, profile, status,
  created_by, approved_by, created_at, approved_at,
  visible_roles, description, updated_at, updated_by
)
SELECT
  json_extract(f.value, '$.id'),
  (
    -- ★ 推导规则：用户数最多的组织，并列取最早创建（实测唯一，见文件头）
    SELECT u.org_id FROM users u
    GROUP BY u.org_id
    ORDER BY COUNT(*) DESC, MIN(u.created_at) ASC
    LIMIT 1
  ),
  json_extract(f.value, '$.module'),
  json_extract(f.value, '$.moduleLabel'),
  COALESCE(json_extract(f.value, '$.enabled'), 0),
  COALESCE(json_extract(f.value, '$.profile'), 'standard'),
  -- 旧数据里 status 是 persist migrate 补的 'system'；如实搬过来
  COALESCE(json_extract(f.value, '$.status'), 'system'),
  json_extract(f.value, '$.createdBy'),
  json_extract(f.value, '$.approvedBy'),
  json_extract(f.value, '$.createdAt'),
  json_extract(f.value, '$.approvedAt'),
  -- JSON 数组列：缺失就写 '[]'（业务语义：空 = 全部可见）
  COALESCE(json_extract(f.value, '$.visibleRoles'), json('[]')),
  json_extract(f.value, '$.description'),
  datetime('now'),
  '0057_backfill'
FROM app_state AS a, json_each(json_extract(a.value, '$.state.flows')) AS f
WHERE a.key = 'ssa-erp-approval-flows'
  AND json_extract(f.value, '$.id') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_flows x WHERE x.id = json_extract(f.value, '$.id')
  );

-- ==================== 2. 子表：28 个审批节点 ====================
-- ★ 关键点：`json_each` 展开 nodes 时，父流程 id 直接取**同一 FROM 子句里的
--   `f.value`**（`f` 是外层流程数组的展开项）—— 原始数据里没有 parentFlowId
--   这个键，也拿不到，只能从外层取。
INSERT INTO approval_flow_nodes (
  id, flow_id, seq, name, role, role_name, condition, timeout, node_order,
  approver_type, approver_roles, approver_user_ids, mode,
  conditions, skip_rule, escalation, optional, fields
)
SELECT
  json_extract(n.value, '$.id'),
  json_extract(f.value, '$.id'),
  COALESCE(json_extract(n.value, '$.order'), 0),
  json_extract(n.value, '$.name'),
  json_extract(n.value, '$.role'),
  json_extract(n.value, '$.roleName'),
  json_extract(n.value, '$.condition'),
  COALESCE(json_extract(n.value, '$.timeout'), 0),
  COALESCE(json_extract(n.value, '$.order'), 0),
  json_extract(n.value, '$.approverType'),
  json_extract(n.value, '$.approverRoles'),
  json_extract(n.value, '$.approverUserIds'),
  json_extract(n.value, '$.mode'),
  -- ★ 嵌套对象：原样取，不套 json_quote（见文件头）
  json_extract(n.value, '$.conditions'),
  json_extract(n.value, '$.skipRule'),
  json_extract(n.value, '$.escalation'),
  COALESCE(json_extract(n.value, '$.optional'), 0),
  json_extract(n.value, '$.fields')
FROM app_state AS a,
     json_each(json_extract(a.value, '$.state.flows')) AS f,
     json_each(json_extract(f.value, '$.nodes')) AS n
WHERE a.key = 'ssa-erp-approval-flows'
  AND json_extract(n.value, '$.id') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_flow_nodes x WHERE x.id = json_extract(n.value, '$.id')
  );

-- ==================== 幂等守卫 ====================
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0057_approval_flow_backfill', datetime('now'))
ON CONFLICT(version) DO NOTHING;
