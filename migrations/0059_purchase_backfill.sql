-- 迁移 0059：采购域存量回填（V3.11.0 · C1 第六域）
--
-- ── 为什么采购域必须在迁移里搬（而不是等前端回填）───────────────
-- 判据见 0058 文件头：「**这个域空了会怎样**」。
--   · 采购申请 = 待审批单据队列，表空 = 审批页面无单可批
--   · 供应商报价 = 比价唯一依据，表空 = PointsCompare 页算不出任何数字
-- 且 **生产 E2E 门禁是直连接口的，永远不走浏览器** →
-- 前端回填在门禁眼里根本不存在。与审批流域同属「配置/单据不能空」这一类。
--
-- ── 搬什么（实测精确数量，非估算）───────────────────────────────
--   申请 5 条 / 申请明细 8 行 / 报价 2 条 / 报价明细 6 行
--
-- ── org_id 怎么定（不硬编码，写可复查的推导规则）─────────────────
-- `app_state` 是全局单份历史配置表，本身不带 org_id，因此必须推导。
-- 采用与 0057 完全相同的规则（保持全项目一致，便于复查）：
--   SELECT org_id FROM users GROUP BY org_id
--   ORDER BY COUNT(*) DESC, MIN(created_at) ASC LIMIT 1
--   → org_04d67b437bf24a5db3d4aa2fc756b45d（8 用户 / 最早 2026-08-18）
--
--   ★ 但本轮**不能只靠这条规则就下结论** —— 实测发现
--     `org_28b6e7c3c0cf475cb0ed6d489cc57927` 也是 8 用户（门禁造的），
--     两者在「用户数」上并列。规则靠 MIN(created_at) 才分出先后，
--     而门禁组织是 2026-09-15 当天创建的、时间必然更晚。
--   ★ 因此**追加一条独立旁证**（本轮发现，值得推广）：
--     `SELECT org_id, COUNT(*) FROM purchase_orders GROUP BY org_id`
--     → org_04d67b… 有 3 条真实采购订单，其余组织全为 1 条（都是门禁造的）。
--     **采购申请/报价与采购订单同属采购业务，必然归于同一组织** ——
--     两条独立证据指向同一答案，这样的 org_id 才是可辩护的。
--
--   ★ 这条经验比 0057 更进了一步：**推导规则给候选，业务旁证做确认**。
--     单靠「用户数最多」在门禁反复造组织的情况下会越来越不可靠。
--
-- ── 两个 SQL 写法要点（都会静默出错、不报错）────────────────────
-- 1. 展开子表时，父单据 id 只能取**同一 FROM 子句里外层展开项的值**
--    —— 原始数据里没有 `requestId` 之外的反向键，也没有显式序号。
-- 2. JSON 列**原样取子对象**：`json_extract` 返回的已经是合法 JSON 文本，
--    **不能再套 `json_quote`**（会多包一层引号，读回时形状全变）。
--
-- ── 幂等 ────────────────────────────────────────────────────────
-- 全部 INSERT 用 `WHERE NOT EXISTS` 守卫，重复执行不会产生重复行。

-- ═══════════════ 1. 采购申请（父表）═══════════════
INSERT INTO purchase_requests (
  id, org_id, request_no, title, applicant, department, type, priority,
  reason, remarks, expected_date, status, total_amount, current_step,
  project_no, project_name, source_type, source_no, source_name,
  custom_fields, approval_records, created_at, updated_at, created_by, updated_by
)
SELECT
  r.value ->> 'id',
  (SELECT org_id FROM users GROUP BY org_id ORDER BY COUNT(*) DESC, MIN(created_at) ASC LIMIT 1),
  r.value ->> 'requestNo',
  r.value ->> 'title',
  r.value ->> 'applicant',
  r.value ->> 'department',
  r.value ->> 'type',
  r.value ->> 'priority',
  r.value ->> 'reason',
  r.value ->> 'remarks',
  r.value ->> 'expectedDate',
  r.value ->> 'status',
  json_extract(r.value, '$.totalAmount'),
  json_extract(r.value, '$.currentStep'),
  r.value ->> 'projectNo',
  r.value ->> 'projectName',
  r.value ->> 'sourceType',
  r.value ->> 'sourceNo',
  r.value ->> 'sourceName',
  -- 对象/数组列：json_extract 已返回合法 JSON 文本，原样写（不再 json_quote）
  json_extract(r.value, '$.customFields'),
  json_extract(r.value, '$.approvalRecords'),
  r.value ->> 'createdAt',
  r.value ->> 'updatedAt',
  r.value ->> 'createdBy',
  r.value ->> 'updatedBy'
FROM app_state a, json_each(a.value, '$.state.purchaseRequests') r
WHERE a.key = 'ssa-erp-purchase'
  AND r.value ->> 'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM purchase_requests p WHERE p.id = r.value ->> 'id');

-- ═══════════════ 2. 采购申请明细（子表）═══════════════
-- ★ 前端 PurchaseRequestItem 自带 id → 主键直接用它（不走 uid 生成）。
-- ★ 父申请表 id 取外层展开项的 r.value ->> 'id'，不是子项里的字段。
INSERT INTO purchase_request_items (
  id, request_id, material_id, material_code, material_name, specification,
  unit, quantity, estimated_price, estimated_amount, delivery_date, remarks, seq
)
SELECT
  it.value ->> 'id',
  r.value ->> 'id',
  it.value ->> 'materialId',
  it.value ->> 'materialCode',
  it.value ->> 'materialName',
  it.value ->> 'specification',
  it.value ->> 'unit',
  json_extract(it.value, '$.quantity'),
  json_extract(it.value, '$.estimatedPrice'),
  json_extract(it.value, '$.estimatedAmount'),
  it.value ->> 'deliveryDate',
  it.value ->> 'remarks',
  CAST(it.key AS INTEGER)
FROM app_state a,
     json_each(a.value, '$.state.purchaseRequests') r,
     json_each(r.value, '$.items') it
WHERE a.key = 'ssa-erp-purchase'
  AND it.value ->> 'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM purchase_request_items x WHERE x.id = it.value ->> 'id');

-- ═══════════════ 3. 供应商报价（父表）═══════════════
INSERT INTO vendor_quotes (
  id, org_id, request_id, vendor_id, vendor_name, total_amount,
  valid_until, remarks, submitted_at, created_at, updated_at
)
SELECT
  q.value ->> 'id',
  (SELECT org_id FROM users GROUP BY org_id ORDER BY COUNT(*) DESC, MIN(created_at) ASC LIMIT 1),
  q.value ->> 'requestId',
  q.value ->> 'vendorId',
  q.value ->> 'vendorName',
  json_extract(q.value, '$.totalAmount'),
  q.value ->> 'validUntil',
  q.value ->> 'remarks',
  q.value ->> 'submittedAt',
  -- VendorQuote 契约里没有 BaseEntity 的 createdAt/updatedAt，用 submittedAt 兜底，
  -- 否则列表按 created_at DESC 排序时这些行会跑到最前/最后，顺序不可解释。
  q.value ->> 'submittedAt',
  q.value ->> 'submittedAt'
FROM app_state a, json_each(a.value, '$.state.vendorQuotes') q
WHERE a.key = 'ssa-erp-purchase'
  AND q.value ->> 'id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM vendor_quotes v WHERE v.id = q.value ->> 'id');

-- ═══════════════ 4. 供应商报价明细（子表）═══════════════
-- ★ QuoteItem **不带 id**（类型里就没有）→ 主键在这里按
--   `quote_id + 行序号` 确定性生成。为什么不随机：
--   随机 id 会让本回填**不可重复执行且每次结果都不同**，
--   而确定性 id 配合 NOT EXISTS 守卫天然幂等。
--   与后端 replaceChildren 的 uid('ci') 不冲突：后端只在新写入时才生成，
--   回填行不会被后端重写（除非用户真的编辑了那条报价）。
INSERT INTO vendor_quote_items (
  id, quote_id, material_id, material_name, quantity, unit_price, amount, seq
)
SELECT
  q.value ->> 'id' || '-it-' || it.key,
  q.value ->> 'id',
  it.value ->> 'materialId',
  it.value ->> 'materialName',
  json_extract(it.value, '$.quantity'),
  json_extract(it.value, '$.unitPrice'),
  json_extract(it.value, '$.amount'),
  CAST(it.key AS INTEGER)
FROM app_state a,
     json_each(a.value, '$.state.vendorQuotes') q,
     json_each(q.value, '$.items') it
WHERE a.key = 'ssa-erp-purchase'
  AND q.value ->> 'id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vendor_quote_items x WHERE x.id = q.value ->> 'id' || '-it-' || it.key
  );

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0059_purchase_backfill', datetime('now'))
ON CONFLICT(version) DO NOTHING;
