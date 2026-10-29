-- 迁移 0058：采购域关系化（V3.11.0 · C1 第六域）
--
-- ── 本迁移做什么 ────────────────────────────────────────────────
-- 把 app_state 里 `ssa-erp-purchase` 这个 JSON 对象的**剩余两个切片**
-- 迁到 D1 关系表：
--   · state.purchaseRequests (5 条, items 合计 8 行) → purchase_requests + purchase_request_items
--   · state.vendorQuotes     (2 条, items 合计 N 行) → vendor_quotes    + vendor_quote_items
--
-- ── 为什么只有两个切片要迁（先想清楚，别多迁也别少迁）───────────
-- 本键共有 **三个** 数据切片，但第三早已完成迁移，不是一个量级的事：
--   · purchaseOrders   —— **V2.75.x 已直连 D1**（表 purchase_orders /
--     purchase_order_items 早已存在），store 的 partialize 也刻意不再写它。
--     本轮**只读一下确认它确实不在 Blob 里**，不重复处理。
--   · purchaseRequests —— 本轮迁。**全项目 15 处写入调用点**（读 34 个消费方）。
--   · vendorQuotes     —— 本轮迁。**全项目 0 处写入调用点**。
--
-- ── ★★ vendorQuotes 看起来像销售域的 marketData，本质完全不同 ──
-- V3.9.0 销售域有一个 `marketData` 切片，当时**刻意不迁**，判据是三条同时成立：
--   (a) 零 CRUD 调用点  (b) 仅一个只读消费方  (c) 本质是报表种子常量，无真实业务价值
-- 本域的 vendorQuotes **看似满足前两条**（零写入调用点、消费方少），
-- 但第 (c) 条**完全不成立** —— 生产库里躺着 **2 条真实供应商报价**，
-- 带 materialId / unitPrice / amount 逐行明细，是「供应商比价」这个业务的
-- 唯一数据载体（PointsCompare 页面读它算最低价与节约额）。
-- → **判据不是「像不像上一个不迁的先例」，而是「这份数据空了会怎样」**。
--   报价空了 = 比价功能没有任何依据 = 功能缺失。
--
-- ── 所以本域与审批流域一样，必须在迁移里一次性搬完 ──────────────
-- 判据同上：「这个域空了会怎样」。
--   · 流水域（销售订单）：空了等用户下一次操作即可，可以交给前端回填。
--   · 本域：采购申请是「待审批单据队列」、报价是「比价依据」，
--     表空着 = 审批页面没东西可批、比价页面没数据可比 = 功能缺失。
--   而且**生产 E2E 门禁是直连接口的，永远不会走浏览器** →
--   前端回填在门禁眼里根本不存在。
--
-- ── 字段契约来源（硬纪律，来自 0053 的教训）─────────────────────
-- 全部列名由 `src/types/purchase.ts` 的
--   PurchaseRequest (extends BaseEntity) / PurchaseRequestItem /
--   VendorQuote / QuoteItem
-- 逐一反推为 snake_case，**不按「采购申请应该长什么样」推断**。
--
-- 迁移前已用脚本逐字段比对生产库真实数据 vs 前端类型（非目测），结论：
--   purchaseRequests 字段全集 = id, requestNo, title, applicant, department,
--     type, priority, reason, expectedDate, status, items, approvalRecords,
--     totalAmount, createdAt, updatedAt, createdBy, updatedBy
--     → 与类型定义**完全一致**；类型里的可选字段 remarks / projectNo /
--       projectName / sourceType / sourceNo / sourceName / customFields /
--       currentStep **在真实数据中一条都没出现**（用户从未使用），
--       但**仍需建列** —— 否则用户一旦填写备注或从 MRP 生成申请，
--       写入会被静默丢弃且返回成功。
--   vendorQuotes 字段全集 = id, requestId, vendorId, vendorName, items,
--     totalAmount, validUntil, remarks, submittedAt → 与类型**完全一致**。
--
-- ── ★ 两个子表的一个关键差异（决定主键怎么来）───────────────────
--   · PurchaseRequestItem **有 `id` 字段**（前端会带）→ 子表主键用它。
--   · QuoteItem **没有 `id` 字段**（类型里就没有）→ 主键由后端
--     `uid('ci')` 生成。parentChild.ts 的 replaceChildren 已处理这种情况
--     （`item.id ? String(item.id) : uid('ci')`），本迁移只需保证列存在。
--
-- ── 字符串/对象嵌套的处理（本域没有，但说明清楚以免误判）─────────
--    · PurchaseRequest.approvalRecords: ApprovalRecord[] —— 这是**嵌套对象数组**
--      （含 approver / action / comment / time）。三条判据：
--      有属性、会参与「谁批的」查询、条数随审批流转增长 → **本应建子表**。
--      但实测生产库 5 条申请中 **该字段一条都没有**（全为 undefined），
--      且审批记录的权威来源是 approval_flows 体系。
--      → 采用与 `interestProducts` 不同的处理：**建子表过度，走父表 JSON 文本列**。
--        理由：它现在无数据，建表只会得到空壳；而它一旦有数据，
--        「整体读出的展示用明细」这个用途 JSON 文本已完全覆盖。
--      若将来需要按审批人/时间做 SQL 统计，再单独建表（届时数据已存在，
--      迁移有真实内容可搬，不会白建）。
--    · 其余字段均为标量，无嵌套。
--
-- ── RLS 取值按业务语义逐张定（不整批复制）───────────────────────
-- 待登记（见 functions/_shared/rls.ts）：
--   · purchase_requests     : 'own'  —— 采购申请是**个人提报的业务单据**
--     （applicant 字段即提报人），与销售线索同属性；「我只该看到自己提的申请」。
--   · purchase_request_items: 'own'  —— 子表随父表，同一业务范围。
--   · vendor_quotes         : 'all'  —— 供应商报价是**比价用的公共信息**，
--     采购员与审批人都要看全部报价才能比价（与财务账目同属性：公司级可查）。
--   · vendor_quote_items    : 'all'  —— 子表随父表。
--   ★ 注意：'own' / 'all' 都是「**本公司内**」的细分，不是跨公司可见。
--
-- ── 旧 Blob 刻意不删 ────────────────────────────────────────────
-- 旧键是唯一的原始证据，留着可逐字段比对、可重放回填。
-- 其它域的旧键也都还在，统一清理是独立动作。
-- **迁移的可回退性优先于「少一份冗余」。**
--
-- ── 关于 schema_migrations ──────────────────────────────────────
-- 与 0056 保持一致：既写 version 行（幂等守卫），也与 wrangler 的
-- d1_migrations 并存（后者由迁移工具自建，不由本文件负责）。

-- ═══════════════ 1. 采购申请（父表）═══════════════
-- 一行一张采购申请单。
CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,                  -- id（前端生成的申请 id）
  org_id TEXT NOT NULL,                 -- 租户归属（父表才存，子表不重复存）
  request_no TEXT,                      -- requestNo（申请单号，如 PR20240501001）
  title TEXT,                           -- title（申请标题）
  applicant TEXT,                       -- applicant（申请人）
  department TEXT,                      -- department（申请部门）
  type TEXT,                            -- type: material|service
  priority TEXT,                        -- priority: low|normal|high|urgent
  reason TEXT,                          -- reason（申请理由）
  remarks TEXT,                         -- remarks（补充说明，区别于 reason；实测未用但类型支持）
  expected_date TEXT,                   -- expectedDate（期望到货日期）
  status TEXT,                          -- status: draft|pending|approved|rejected|ordered
  total_amount REAL,                    -- totalAmount（申请总额）
  current_step INTEGER DEFAULT 0,       -- currentStep（当前审批步骤索引）
  project_no TEXT,                      -- projectNo
  project_name TEXT,                    -- projectName
  source_type TEXT,                     -- sourceType: manual|salesOrder|workOrder|mrp
  source_no TEXT,                       -- sourceNo（来源单据编号）
  source_name TEXT,                     -- sourceName（来源单据名称）
  custom_fields TEXT,                   -- customFields（自定义字段，对象）→ JSON 文本
  approval_records TEXT,                -- approvalRecords（审批记录数组）→ JSON 文本（见文件头说明）
  created_at TEXT,                      -- createdAt（ISO）
  updated_at TEXT,                      -- updatedAt（ISO）
  created_by TEXT,                      -- createdBy
  updated_by TEXT,                      -- updatedBy
  owner_id TEXT,                        -- 行级权限：'own' 用
  dept_id TEXT                          -- 行级权限：部门范围用
);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_no ON purchase_requests(org_id, request_no);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(org_id, status);
-- 按状态+优先级筛「待我审批的单据」是最常用查询路径。
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status_pri ON purchase_requests(org_id, status, priority);

-- ═══════════════ 2. 采购申请明细（子表）═══════════════
-- 一行一个申请物料。★ 前端 PurchaseRequestItem **带 id** → 主键直接用它。
CREATE TABLE IF NOT EXISTS purchase_request_items (
  id TEXT PRIMARY KEY,                  -- item.id（前端提供）
  request_id TEXT NOT NULL,             -- 从属申请，不重复存 org_id
  material_id TEXT,                     -- materialId
  material_code TEXT,                   -- materialCode
  material_name TEXT,                   -- materialName
  specification TEXT,                   -- specification（规格）
  unit TEXT,                            -- unit（单位）
  quantity REAL,                        -- quantity（数量）
  estimated_price REAL,                 -- estimatedPrice（预估单价）
  estimated_amount REAL,                -- estimatedAmount（预估金额）
  delivery_date TEXT,                   -- deliveryDate（期望交期）
  remarks TEXT,                         -- remarks（行备注）
  seq INTEGER DEFAULT 0,                -- 保留列：明细展示顺序（前端未提供显式序号，按插入顺序）
  FOREIGN KEY (request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_purchase_request_items_req ON purchase_request_items(request_id);

-- ═══════════════ 3. 供应商报价（父表）═══════════════
-- 一行一家供应商对某张申请单的整单报价。
CREATE TABLE IF NOT EXISTS vendor_quotes (
  id TEXT PRIMARY KEY,                  -- id
  org_id TEXT NOT NULL,
  request_id TEXT,                      -- requestId（对应采购申请）
  vendor_id TEXT,                       -- vendorId
  vendor_name TEXT,                     -- vendorName
  total_amount REAL,                    -- totalAmount（报价总额）
  valid_until TEXT,                     -- validUntil（报价有效期）
  remarks TEXT,                         -- remarks（报价备注）
  submitted_at TEXT,                    -- submittedAt（提交时间）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_req ON vendor_quotes(org_id, request_id);
CREATE INDEX IF NOT EXISTS idx_vendor_quotes_vendor ON vendor_quotes(org_id, vendor_id);

-- ═══════════════ 4. 供应商报价明细（子表）═══════════════
-- 一行一个报价物料。★ QuoteItem **不带 id**（类型里就没有 id 字段）→
-- 主键由后端 uid('ci') 生成，本表只需保证 id 列存在且唯一。
CREATE TABLE IF NOT EXISTS vendor_quote_items (
  id TEXT PRIMARY KEY,                  -- 后端生成（QuoteItem 无 id 字段）
  quote_id TEXT NOT NULL,               -- 从属报价，不重复存 org_id
  material_id TEXT,                     -- materialId
  material_name TEXT,                   -- materialName
  quantity REAL,                        -- quantity
  unit_price REAL,                      -- unitPrice（报价单价）
  amount REAL,                          -- amount（= quantity * unitPrice）
  seq INTEGER DEFAULT 0,                -- 保留列：明细展示顺序
  FOREIGN KEY (quote_id) REFERENCES vendor_quotes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vendor_quote_items_quote ON vendor_quote_items(quote_id);

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0058_purchase_domain', datetime('now'))
ON CONFLICT(version) DO NOTHING;
