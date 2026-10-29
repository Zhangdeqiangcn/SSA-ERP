-- 迁移 0061：生产域关系化（V3.12.0 · C1 第七域）
--
-- ═══════════════ 本迁移做什么 ═══════════════
-- 把 app_state 里 `ssa-erp-production` 这个 JSON 对象**剩余的两个切片**
-- 迁到 D1 关系表：
--   · state.processRoutes      (2 条, operations 合计 10 行)
--       → process_routes + process_route_operations
--   · state.mrpRecommendations (4 条，平表)
--       → mrp_recommendations
--
-- ═══════════════ ★ 本域与前面六个域最大的不同：它是「半迁移」状态 ═══════════════
-- `useProductionStore` 里**第三个切片 workOrders 早就直连 D1 了**
-- （W1 根治双通道：/api/work-orders + 表 work_orders，V2.75.x 完成），
-- store 的 partialize 也早已不写它。
-- 也就是说：**「生产域」这个说法容易误导** —— 真正没迁的只有上面两个切片。
--
-- ★ 教训（动手前三件套必须靠脚本量化的原因）：
--   本轮开工前若照着「生产域 3.7 KB / 消费方 25」这个旧结论直接建工单表，
--   会做出一张**与 work_orders 重复**的表，且 store 根本不往里写。
--   **体积与消费方是「这个域有多大」的指标，不是「这个域里还剩下什么没迁」的指标。**
--   后者必须读 store 的 `partialize` —— 那才是「现在还在往 Blob 里写什么」的唯一事实。
--
-- ═══════════════ 三个切片，三种命运（逐一切分，不一刀切）═══════════════
--   · workOrders        —— 已直连 D1，**本轮不碰**（重复建表 = 双源）。
--   · processRoutes     —— 迁。**有嵌套**：operations[] 每行还带 skills[]。
--                          写入调用点：addProcessRoute 1 / updateProcessRoute 1 / delete 0。
--                          ProcessRouteList.tsx 是唯一编辑入口。
--   · mrpRecommendations—— 迁。**无嵌套**（13 个字段全是标量）。
--                          写入调用点：add 1（FlowSelfTest）/ delete 2（MRPPlan）
--                          / setMrpRecommendations 1（BOMDetail，整体替换）/ update 0。
--
-- ═══════════════ ★ mrpRecommendations 为什么走通用实体路由、不新增端点 ═══════════════
-- C1 模板第 ③ 条写得很清楚：
--   无嵌套 → 走通用实体路由即可，零新增端点。
-- 它是**平表**：MRPRecommendation 的 13 个字段全是标量，没有数组。
-- 为平表再写一遍 index/[id] 两个文件 = 把同一套逻辑抄第二份，
-- 而抄第二份就意味着「将来改一处忘另一处」。
-- 只需在 `functions/_shared/entities.ts` 的 ENTITY_RESOURCES 登记一个
-- `mrpRecommendation` 资源即可（与 V3.7.0 财务域 7 个平表切片同款处理）。
--
-- ═══════════════ ★ processRoutes 为什么必须用 parentChild（有嵌套）═══════════════
-- `ProcessRoute.operations: Operation[]`，而 Operation 自己还带
--   · skills: string[]（字符串数组）
-- 这是**两层嵌套**：父 → 工序行 → 技能名列表。
-- 若走通用实体路由，pickSnake 只挑登记过的标量列 ——
--   operations 整个数组会被**静默丢弃且返回 201**。
-- 后果：「工艺路线列表都在、点进去单号版本都对，但工序一条都没有」，
-- 而工艺路线的全部价值就在于工序。这正是 V3.6.0 BOM 轮次最危险的那类缺陷。
--
-- ── skills 为什么走子表 JSON 文本列、不建第三张表 ──────────────────
-- `skills: ['焊接','焊接工艺','焊缝检验']` —— 建表只会得到
-- 「每行一个技能名、没有 id、没有属性」的空壳表，
-- 且从来不会有人按「会焊接的工序有哪些」做 SQL 统计（那是 HR 技能矩阵的事）。
-- **判据是「将来会不会需要按内部字段做 SQL 统计」**，不是「它是不是数组」。
-- （与采购域 approvalRecords 同一判据；与销售域 team / interestProducts 同款处理。）
--
-- ═══════════════ 字段契约来源（硬纪律，来自 0053 的教训）═══════════════
-- 全部列名由 `src/types/production.ts` 的
--   ProcessRoute (extends BaseEntity) / Operation / MRPRecommendation
-- 逐一反推为 snake_case，**不按「工艺路线应该长什么样」推断**。
--
-- 迁移前已用 `scripts/_cmp_production.mjs` 逐字段比对生产库 vs 代码默认值
-- （非目测），结论：
--   processRoutes 字段全集 = id, routeNo, name, productCode, productName,
--     version, status, totalLeadTime, operations, createdAt, updatedAt,
--     createdBy, updatedBy → 与类型定义**完全一致**
--   operations[0] 字段全集 = id, sequence, operationCode, operationName,
--     workCenter, setupTime, runTime, waitTime, description, skills
--     → 与类型 Operation **完全一致**
--   mrpRecommendations 字段全集 = id, materialCode, materialName,
--     currentStock, safetyStock, requiredQuantity, onOrderQuantity,
--     suggestedQuantity, unit, suggestedDate, reason, type, priority
--     → 与类型**完全一致**
--   ★ 三个切片**逐字段零差异**（route-001/002、mrp-001~004 全部 "完全一致"）→
--     不存在「拿代码默认值覆盖用户真实改动」的风险（V3.10.0 审批流域就险些踩中）。
--     但这**不能反推**成「以后可以不用比对」——那一轮只有一处改动，
--     而那一处正是唯一不能覆盖的东西。
--
-- ═══════════════ RLS 取值按业务语义逐张定（不整批复制）═══════════════
-- 待登记（见 functions/_shared/rls.ts）：
--   · process_routes            : 'all'
--   · process_route_operations  : 'all'（从属父表）
--   · mrp_recommendations       : 'all'
--
-- ★ 本域**三张表全取 'all'，这是结论而不是偷懒**，理由逐张不同：
--   · 工艺路线 = 「这个产品该怎么造」的**公司级制造标准**，与 BOM 同属性
--     （bom_headers 已登 'all'）。车间主任、工艺员、计划员都要看同一份。
--     若误登 'own'：别人建的工艺路线我选不到 → 工单开不出来，
--     表现是「下拉框少几项、零报错」（V3.11.0 采购域同款静默表现）。
--   · MRP 建议 = **中央计划的输出**，由共享的 BOM / 库存 / 工单算出，
--     任何人跑同一套 MRP 结果都一样，不是个人资产。
--     与 planned_orders（V3.5.0，已登 'all'）同属性。
--     若误登 'own'：计划员 A 看不到 B 算的建议 → 对同一物料**重复下单**。
--
-- ★★ 与采购域的一处刻意不同，必须说清楚：
--   采购域是「同域内两张表取值相反」（申请 'own' / 报价 'all'），
--   本域**不存在这种对立**，因为本域没有「个人业务单据」这一属性。
--   **不能为了制造对照而制造差异** —— 权限值的唯一依据是业务语义。
--   （同域 work_orders 早已是 'all'，三张新表与它保持一致。）
--
-- ═══════════════ 旧 Blob 刻意不删 ═══════════════
-- 旧键是唯一的原始证据，留着可逐字段比对、可重放回填（0057/0059 同款处理）。
--
-- ═══════════════ SQL 注释纪律（0060 的教训）══════════════
-- 本文件所有注释一律用 `--`。写 `//` 会让 apply 报
-- `near "/": syntax error`，而 `_audit_syntax.mjs` **只解析 .ts 不解析 .sql**，
-- 抓不到这个错 —— 只有真正 apply 的时候才会炸。

-- ═══════════════ 1. 工艺路线（父表）═══════════════
-- 一行一条工艺路线。route_no 在同组织内唯一（真正建约束见文件末尾）。
CREATE TABLE IF NOT EXISTS process_routes (
  id TEXT PRIMARY KEY,                  -- id（前端生成的路线 id，如 route-001）
  org_id TEXT NOT NULL,                 -- 租户归属（父表才存，子表不重复存）
  route_no TEXT,                        -- routeNo（工艺路线编号，如 RT-2024-001）
  name TEXT,                            -- name（路线名称）
  product_code TEXT,                    -- productCode（适用产品编码）
  product_name TEXT,                    -- productName（适用产品名称）
  version TEXT,                         -- version（版本，如 V2.0）
  status TEXT,                          -- status: draft|active|obsolete
  total_lead_time REAL,                 -- totalLeadTime（总提前期，小时）
  created_at TEXT,                      -- createdAt（ISO）
  updated_at TEXT,                      -- updatedAt（ISO）
  created_by TEXT,                      -- createdBy
  updated_by TEXT,                      -- updatedBy
  owner_id TEXT,                        -- 行级权限：'own' 用
  dept_id TEXT                          -- 行级权限：部门范围用
);
CREATE INDEX IF NOT EXISTS idx_process_routes_no ON process_routes(org_id, route_no);
CREATE INDEX IF NOT EXISTS idx_process_routes_status ON process_routes(org_id, status);
-- 「按产品查有哪些可用工艺路线」是工单创建时最高频的查询路径。
CREATE INDEX IF NOT EXISTS idx_process_routes_product ON process_routes(org_id, product_code, status);

-- ═══════════════ 2. 工艺路线工序（子表）═══════════════
-- 一行一道工序。★ Operation **自带 id**（op-001…）→ 主键直接用它。
CREATE TABLE IF NOT EXISTS process_route_operations (
  id TEXT PRIMARY KEY,                  -- op.id（前端提供）
  route_id TEXT NOT NULL,               -- 从属工艺路线，不重复存 org_id
  seq INTEGER DEFAULT 0,                -- 插入顺序（parentChild 的 childOrder 用它排序）
  sequence INTEGER,                     -- sequence（工序序号：10/20/30，业务意义上的顺序）
  operation_code TEXT,                  -- operationCode（工序编码，如 OP-WELD）
  operation_name TEXT,                  -- operationName（工序名称）
  work_center TEXT,                     -- workCenter（工作中心）
  setup_time REAL,                      -- setupTime（准备时间，分钟）
  run_time REAL,                        -- runTime（运行时间，分钟/件）
  wait_time REAL,                       -- waitTime（等待时间，小时）
  description TEXT,                     -- description（工序说明）
  skills TEXT,                          -- skills（技能要求，字符串数组）→ JSON 文本，见文件头说明
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_process_route_ops_route ON process_route_operations(route_id, seq);

-- ═══════════════ 3. MRP 建议（平表）═══════════════
-- 一行一条净需求建议。无嵌套 → 走通用实体路由 /api/entities/mrpRecommendation。
CREATE TABLE IF NOT EXISTS mrp_recommendations (
  id TEXT PRIMARY KEY,                  -- id（mrp-001…）
  org_id TEXT NOT NULL,
  material_code TEXT,                   -- materialCode
  material_name TEXT,                   -- materialName
  current_stock REAL,                   -- currentStock（现有库存）
  safety_stock REAL,                    -- safetyStock（安全库存）
  required_quantity REAL,               -- requiredQuantity（毛需求）
  on_order_quantity REAL,               -- onOrderQuantity（在途量）
  suggested_quantity REAL,              -- suggestedQuantity（建议量）
  unit TEXT,                            -- unit（单位）
  suggested_date TEXT,                  -- suggestedDate（建议日期）
  reason TEXT,                          -- reason（建议理由）
  type TEXT,                            -- type: purchase|manufacture
  priority TEXT,                        -- priority: urgent|high|normal
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  owner_id TEXT,
  dept_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_mrp_rec_material ON mrp_recommendations(org_id, material_code);
-- MRPPlan 页默认按紧急度排序展示，这是该页唯一的排序维度。
CREATE INDEX IF NOT EXISTS idx_mrp_rec_priority ON mrp_recommendations(org_id, priority);

-- ═══════════════ 4. 业务单号唯一约束 ═══════════════
-- ★ 0500 的教训：0058 建表时**漏了**唯一约束，而 purchaseConfig.ts 的注释与
--   parentChild 的两段 409 分支都假定它存在 → 分支永不触发 →
--   「同一单号能建出第二条」。本轮**在建表的同一个迁移里就建好**，
--   不再留到事后补（事后补的前提还得先查有没有重复）。
-- 这里用 CREATE UNIQUE INDEX 而非表内 UNIQUE 子句：语义完全等价、
-- 错误信息同样含 "UNIQUE"（parentChild 的 409 分支照样命中）、零数据搬迁。
CREATE UNIQUE INDEX IF NOT EXISTS uniq_process_routes_no
  ON process_routes(org_id, route_no);

-- ── 幂等守卫 ────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0061_production_domain', datetime('now'))
ON CONFLICT(version) DO NOTHING;
