-- 迁移 0050：计划订单落库（B2 流程闭环）
-- 整改版本：V3.5.0
--
-- ── 为什么要这张表（第一性原理）────────────────────────────────────
-- B2 之前，MRP 运算结果（净需求 / 建议采购量 / 建议生产量）的生命周期只有两站：
--   ① React 组件内的一个 useState 数组  → ② 点「生成采购申请 / 生成工单」后消失。
-- 关闭页面即全部丢失，且**没有任何一处留下「这次运算算出了什么」的证据**。
-- 这带来三个真实业务后果：
--   1) 计划员上午算完，下午被叫去开会，回来页面已被刷新 —— 算法跑白跑，只能重算；
--   2) 采购/生产是否真的按 MRP 建议执行了，事后无法核对（建议 500 件、实际下 200 件，无人察觉）；
--   3) 同一个销售订单改了一次交期，重算后与上轮建议的**差异**无从对比，改了哪几项靠人脑记。
--
-- 计划订单（Planned Order）正是制造业解决这三件事的标准答案（SAP 的 PLAF、金蝶的
-- 计划订单都是同一个概念）：MRP 的产出不是「立即变成采购申请/工单」，而是先落成一张
-- **可复算、可确认、可转换**的中间单据。它是需求与执行之间的缓冲区。
--
-- ── 设计取舍 1：为什么 run_id 是这张表的灵魂，而不是可选字段 ────────
-- 一次 MRP 运算（一个 run_id）产出一批计划订单。没有 run_id 就只能是流水账，
-- 有了 run_id 才能回答「这一轮运算算出了什么、与上一轮差在哪」。
-- 因此 run_id 不是元数据，它是这张表的主查询维度：
--   查「最新一轮建议」= 取 run_id 最大的那批。
-- 索引 idx_planned_run 就是为此建的。
--
-- ── 设计取舍 2：幂等靠「业务唯一键」，不靠「先查后插」────────────────
-- 需求里明确要求「同一 MRP 运行号重复落库不产生重复行」。做法不是应用层先 SELECT
-- 再 INSERT（并发下必然漏判），而是让数据库用唯一约束兜底：
--   唯一键 = (org_id, run_id, material_code, type)
-- 含义：同一轮运算中，同一物料的同一种建议类型，只能有一行。
-- 应用层用 INSERT ... ON CONFLICT DO UPDATE（upsert），重复提交天然退化为「更新」，
-- 既满足幂等，又让「重算后数量变了」能被如实反映出来。
--
-- ── 设计取舍 3：status 为什么必须有 'converted' 与 'void' 两个终态 ────
-- 'draft'      —— MRP 刚算出，尚无人处理；
-- 'confirmed'  —— 计划员已确认要执行（相当于给建议「盖章」，但还没下正式单）；
-- 'converted'  —— 已转成采购申请 / 生产工单，此时 planned_order 成为「建议 → 执行」的追溯链起点；
-- 'void'       —— 计划员否决了该建议（例如他知道某车间已备料）。
-- 只做 draft/converted 二态会丢失一个关键信息：**有多少建议被人工否决了**。
-- 被否决率高说明 MRP 参数（安全库存 / 提前期 / 批量）与实际脱节，这是参数调优的信号。
--
-- ── 设计取舍 4：为什么存 qty 拆分（gross / on_hand / on_order / net）───
-- 只存净需求（net）等于只存答案不存过程。计划员看到「净需求 500」第一反应是
-- 「为什么是 500」，必须能立刻看到「毛需求 800 − 现有库存 200 − 在途 100 = 500」。
-- 四个数都存下来，界面上就能展开成一行算式，质疑时不用回去重算。
--
-- ── 设计取舍 5：为什么用 TEXT 存日期而不是 DATE ────────────────────
-- 与库内既有约定一致（work_orders.planned_start_date 等均为 TEXT），
-- 且 SQLite 无 DATE 类型。格式统一为 YYYY-MM-DD。
--
-- ── 设计取舍 6：bucket_start 的作用 ───────────────────────────────
-- B1 已把毛需求按周切桶。计划订单记下它落在哪个周桶的起点，
-- 就能在界面上按周聚合展示「第 38 周要投 500、第 40 周要投 300」，
-- 与采购的周对账节奏对齐；同时也让「同一物料跨周分两批投放」成为可见的两行。
--
-- ── 与 RLS 的关系（重要）────────────────────────────────────────
-- 本表为组织内共享的计划单据（与 work_orders 同属性），需在
-- functions/_shared/rls.ts 的 RLS_SCOPE 中登记为 'all'，
-- 否则 V3.3.0 起的「默认拒绝」策略会让查询返回空表且无报错。
-- ⚠️ 这是上一轮（V3.4.0 A5）踩过的坑：新增 D1 表必须同批登记 RLS。

CREATE TABLE IF NOT EXISTS planned_orders (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,

  -- 运算批次：一次 MRP 运算 = 一个 run_id。本表的主查询维度（见设计取舍 1）
  run_id        TEXT NOT NULL,
  run_at        TEXT,                         -- 该轮运算的时间戳（冗余存，便于按批展示时不用再查）

  -- 物料
  material_code TEXT NOT NULL,
  material_name TEXT,
  unit          TEXT,

  -- 建议类型：purchase（建议采购）/ manufacture（建议自制）
  type          TEXT NOT NULL,

  -- 数量拆分（见设计取舍 4：存过程不只存答案）
  gross_qty     REAL NOT NULL DEFAULT 0,      -- 毛需求（含废品损耗放大后的量）
  on_hand_qty   REAL NOT NULL DEFAULT 0,      -- 运算时的现有库存
  on_order_qty  REAL NOT NULL DEFAULT 0,      -- 运算时的在途采购
  net_qty       REAL NOT NULL DEFAULT 0,      -- 净需求 = 毛需求 − 现有库存 − 在途（下限 0）
  planned_qty   REAL NOT NULL DEFAULT 0,      -- 建议量 = 净需求经批次/MOQ 取整后的实际下单量

  -- 时间（见设计取舍 5、6）
  due_date      TEXT,                         -- 需求日期（建议到货/完工日）
  bucket_start  TEXT,                         -- 所属周桶起点（B1 期间分段的落点）
  low_level_code INTEGER NOT NULL DEFAULT 0,  -- 低层码（B1）：该物料在 BOM 树中的最深层级

  -- 状态机（见设计取舍 3）
  status        TEXT NOT NULL DEFAULT 'draft',-- draft | confirmed | converted | void

  -- 追溯：转成正式单据后回填，构成「建议 → 执行」的追溯链
  converted_type TEXT,                        -- purchase_requisition | work_order
  converted_id   TEXT,
  converted_no   TEXT,

  priority      TEXT DEFAULT 'normal',        -- urgent | high | normal
  reason        TEXT,                         -- 建议依据（MRP 给出的理由文本）
  note          TEXT,

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_by    TEXT,

  -- 幂等靠数据库唯一约束兜底，而非应用层「先查后插」（见设计取舍 2）
  UNIQUE (org_id, run_id, material_code, type)
);

-- 查「最新一轮建议」：按 run_id 定位 + 按状态筛
CREATE INDEX IF NOT EXISTS idx_planned_run ON planned_orders(org_id, run_id, status);
-- 查物料的历史计划轨迹（「这个料被建议过几次、兑现了几次」）
CREATE INDEX IF NOT EXISTS idx_planned_material ON planned_orders(org_id, material_code, created_at DESC);
-- 查待处理列表（计划员最常用的入口：只看 draft）
CREATE INDEX IF NOT EXISTS idx_planned_status ON planned_orders(org_id, status, due_date);
-- 按周桶看投放节奏（B1 期间分段在计划订单侧的延续）
CREATE INDEX IF NOT EXISTS idx_planned_bucket ON planned_orders(org_id, bucket_start);

-- 行级策略扩展列（与既有业务表保持一致：库内 0013 迁移为业务表统一加了这两列）
ALTER TABLE planned_orders ADD COLUMN owner_id TEXT;
ALTER TABLE planned_orders ADD COLUMN dept_id  TEXT;

-- 幂等守卫（业务版本登记）
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0050_planned_orders', datetime('now'))
ON CONFLICT(version) DO NOTHING;
