-- 迁移 0062：生产域存量回填（V3.12.0 · C1 第七域）
--
-- ═══════════════ 搬什么（实测精确数量，非估算）══════════════
--   工艺路线 2 条 / 工序 10 行 / MRP 建议 4 条
--   来源：app_state['ssa-erp-production']（3775 字节，包裹层 {"state":{...}}）
--
-- ═══════════════ ★★ org_id 怎么定：本轮纠正了 0057/0059 的做法 ═══════════════
--
-- 【旧做法（0057 审批流 / 0059 采购域）】
--   SELECT org_id FROM users GROUP BY org_id
--   ORDER BY COUNT(*) DESC, MIN(created_at) ASC LIMIT 1
--   注释里写的前提是：「app_state 是全局单份历史配置表，**本身不带 org_id**」。
--
-- 【★ 这个前提是错的 —— 本轮实测坐实】
--   生产库 app_state 的真实 DDL：
--     CREATE TABLE app_state (
--       org_id      TEXT NOT NULL,
--       key         TEXT NOT NULL,
--       value       TEXT NOT NULL,
--       updated_at  TEXT NOT NULL, version INTEGER, updated_by TEXT,
--       PRIMARY KEY (org_id, key))
--   **它带 org_id，而且是主键的一部分。**
--
-- 【后果：那两轮换填落错了组织】
--   · app_state 里 ssa-erp-purchase / ssa-erp-approval-flows 的 org_id
--     = org_d213a257563c40cca55551781cef67f9（公司码 CY03Z「创业三人组」）
--   · 而 0057/0059 回填进去的行落在
--     org_04d67b437bf24a5db3d4aa2fc756b45d（公司码 xinguang「新光专用汽车」）
--   · 实测：`purchase_requests` 5 条在 xinguang、CY03Z 为 0；
--           `approval_flows`  13 条在 xinguang、CY03Z 为 0。
--   → **真正的所有者打开页面看到的是空列表**（RLS 按 org_id 隔离）。
--     这是「静默失效」里最难发现的一类：迁移执行成功、行数对得上、
--     门禁全绿，但**用户就是看不到**。
--
-- 【★ 更糟的是：0059 用来「确认」的那条旁证，指向的正是被污染的那份数据】
--   0059 注释写：「追加一条独立旁证 —— SELECT org_id,COUNT(*) FROM purchase_orders
--   GROUP BY org_id → org_04d6… 有 3 条真实采购订单」。
--   但项目记忆明确记载：2026-08-28 seed 污染事故往生产库灌了
--   **供应商 12 / 客户 5 / 采购订单 3 / 销售订单 3 / 工单 3 条**。
--   本轮实测 xinguang 各表计数：vendor_master 12? / customers 5 / purchase_orders 3 /
--   sales_orders 3 / work_orders 3 —— **与污染记录逐项吻合**。
--   也就是说「旁证」确认的是一个**被污染组织**，两条证据同时指错。
--
-- 【★ 决定性证据：账号归属】
--   强哥的账号 zhangdeqiang（张德强 / super_admin）在 **CY03Z**。
--   Blob 是登录用户写进去的 → app_state 行的 org_id 就是其所属组织。
--   **一手证据（表自己的 org_id）> 推导（谁用户多）> 旁证（哪张表数据多）。**
--   当三者冲突时，取一手证据。
--
-- 【本迁移的做法】
--   直接用 `a.org_id`（app_state 行自带的组织），不推导、不旁证。
--   这条规则应当成为后续所有域回填的**默认写法**：
--     FROM app_state a, json_each(a.value, '$.state.<切片>') r
--     WHERE a.key = 'ssa-erp-xxx'  -- org_id 取 a.org_id
--
-- ═══════════════ SQL 写法要点（沿用 0059 的两条）══════════════
-- 1. 展开子表时父 id 取**外层展开项** r.value ->> 'id'。
-- 2. JSON 列（skills）用 json_extract 原样取，**不能再套 json_quote**
--    （会多包一层引号，读回时形状全变 —— 数组会变成字符串）。
--
-- ═══════════════ 幂等 ═══════════════
-- 全部 INSERT 用 WHERE NOT EXISTS 守卫，重复执行不产生重复行。

-- ═══════════════ 1. 工艺路线（父表）═══════════════
INSERT INTO process_routes (
  id, org_id, route_no, name, product_code, product_name, version, status,
  total_lead_time, created_at, updated_at, created_by, updated_by
)
SELECT
  r.value ->> 'id',
  a.org_id,                             -- ★ 一手证据：Blob 行自带的组织
  r.value ->> 'routeNo',
  r.value ->> 'name',
  r.value ->> 'productCode',
  r.value ->> 'productName',
  r.value ->> 'version',
  r.value ->> 'status',
  json_extract(r.value, '$.totalLeadTime'),
  r.value ->> 'createdAt',
  r.value ->> 'updatedAt',
  r.value ->> 'createdBy',
  r.value ->> 'updatedBy'
FROM app_state a, json_each(a.value, '$.state.processRoutes') r
WHERE a.key = 'ssa-erp-production'
  AND r.value ->> 'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM process_routes p WHERE p.id = r.value ->> 'id');

-- ═══════════════ 2. 工艺路线工序（子表）═══════════════
-- ★ Operation 自带 id（op-001…）→ 主键直接用它，不走 uid 生成。
-- ★ 父 id 取外层展开项 r.value ->> 'id'，不是子项里的字段。
-- ★ seq 用数组下标（json_each 的 key）作为稳定插入顺序。
INSERT INTO process_route_operations (
  id, route_id, seq, sequence, operation_code, operation_name, work_center,
  setup_time, run_time, wait_time, description, skills, created_at, updated_at
)
SELECT
  op.value ->> 'id',
  r.value ->> 'id',
  CAST(op.key AS INTEGER),
  json_extract(op.value, '$.sequence'),
  op.value ->> 'operationCode',
  op.value ->> 'operationName',
  op.value ->> 'workCenter',
  json_extract(op.value, '$.setupTime'),
  json_extract(op.value, '$.runTime'),
  json_extract(op.value, '$.waitTime'),
  op.value ->> 'description',
  json_extract(op.value, '$.skills'),   -- JSON 数组原样写入 TEXT 列
  NULL,
  NULL
FROM app_state a,
     json_each(a.value, '$.state.processRoutes') r,
     json_each(r.value, '$.operations') op
WHERE a.key = 'ssa-erp-production'
  AND op.value ->> 'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM process_route_operations x WHERE x.id = op.value ->> 'id');

-- ═══════════════ 3. MRP 建议（平表）═══════════════
INSERT INTO mrp_recommendations (
  id, org_id, material_code, material_name, current_stock, safety_stock,
  required_quantity, on_order_quantity, suggested_quantity, unit,
  suggested_date, reason, type, priority, created_at, updated_at
)
SELECT
  m.value ->> 'id',
  a.org_id,
  m.value ->> 'materialCode',
  m.value ->> 'materialName',
  json_extract(m.value, '$.currentStock'),
  json_extract(m.value, '$.safetyStock'),
  json_extract(m.value, '$.requiredQuantity'),
  json_extract(m.value, '$.onOrderQuantity'),
  json_extract(m.value, '$.suggestedQuantity'),
  m.value ->> 'unit',
  m.value ->> 'suggestedDate',
  m.value ->> 'reason',
  m.value ->> 'type',
  m.value ->> 'priority',
  NULL,
  NULL
FROM app_state a, json_each(a.value, '$.state.mrpRecommendations') m
WHERE a.key = 'ssa-erp-production'
  AND m.value ->> 'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM mrp_recommendations x WHERE x.id = m.value ->> 'id');

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0062_production_backfill', datetime('now'))
ON CONFLICT(version) DO NOTHING;
