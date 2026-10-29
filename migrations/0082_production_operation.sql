-- ─────────────────────────────────────────────────────────────
-- 迁移 0082：生产运营域落库（V3.46.0 第2批③）
--
-- ═══════════════ 背景（为什么必须迁）════════════════════════════
-- 工序报工、工作中心、成本费率此前**只存在用户浏览器里**（zustand persist 的
-- 本地大对象，键 ssa-erp-production-operation），服务端没有任何表。
-- 三个直接危害：
--
-- ① **成本不可复算**：费率（laborRate / machineRate）换台电脑打开就是另一个值，
--    于是「3 月报的成本」与「6 月重算 3 月报的成本」对不上，且**谁都说不清差在哪**。
--    对标 SAP：成本要素价格是主数据（KSAL/KSTK），有生效日期与变更留痕，
--    绝不允许存在于个人电脑。
-- ② **报工丢失**：浏览器清了缓存 / 换设备 / 多人协作时，已录入的工序报工整块消失，
--    而工单进度却可能已按它算过 → 工单状态与实际产量脱节。
-- ③ **报表无口径**：管理层看工序级产量/工时/报废，只能靠各人自己那份本地数据汇总，
--    不同人汇总的结果不同。
--
-- ═══════════════ 本迁移做什么 ═════════════════════════════════════
-- ① 补齐 mes_operation_reports 的缺失列（建表时只有 6 个业务列，报工所需字段
--    大半没有 → 此前即使接了实体端点也存不下 laborHours/operator 等）
-- ② 新建 work_centers（工作中心：产能/工时是排产与标准工时的基础）
-- ③ 新建 production_rates（成本费率：人工费率/机器费率，按期间生效，
--    解决"用哪天的费率算"的历史追溯问题）
--
-- ═══════════════ 为什么不重建 mes_operation_reports ═════════════════════
-- 表里可能有存量数据，重建会丢；ADD COLUMN 对存量零影响（NULL 视为"未记录"），
-- 且迁移可重复执行幂等。

-- ─────────────────────────────────────────────────────────────
-- ① 补齐工序报工缺失列
-- ─────────────────────────────────────────────────────────────
-- operation_id：工序在工艺路线里的标识。原表只有 operation_name（名称字符串），
--   改名即与历史报工脱钩（与 V3.45.0 修的"报表按科目名匹配"同类问题）。
ALTER TABLE mes_operation_reports ADD COLUMN operation_id TEXT;
-- operator：报工人。原表完全没有 → 谁报的工查不到，产量责任无从追溯。
ALTER TABLE mes_operation_reports ADD COLUMN operator TEXT;
-- start_time / end_time：工序起止，用于算单件工时与在制时长（原表无法算）。
ALTER TABLE mes_operation_reports ADD COLUMN start_time TEXT;
ALTER TABLE mes_operation_reports ADD COLUMN end_time TEXT;
-- labor_hours：投入工时。**成本计算直接依赖它**，缺失即人工成本恒 0。
ALTER TABLE mes_operation_reports ADD COLUMN labor_hours REAL DEFAULT 0;
-- station：工位/线别，用于细分工时归集。
ALTER TABLE mes_operation_reports ADD COLUMN station TEXT;
-- note：报工备注。
ALTER TABLE mes_operation_reports ADD COLUMN note TEXT;

-- 按工单+工序查报工（工序级进度看板的主查询路径，此前无索引支撑）
CREATE INDEX IF NOT EXISTS idx_mes_oprep_wo_op
  ON mes_operation_reports(org_id, work_order_id, operation_id);
-- 按工单查报工
CREATE INDEX IF NOT EXISTS idx_mes_oprep_wo
  ON mes_operation_reports(org_id, work_order_id);

-- ─────────────────────────────────────────────────────────────
-- ② 工作中心主数据
-- ─────────────────────────────────────────────────────────────
-- capacity_hours：单班可用工时（排产/负荷计算的输入，对标 SAP 工作中心 capacity）。
-- 是否设 RLS 登记为 'dept'：工作中心是**生产资源主数据**，全厂共用一套口径，
--   登 'all' 更合适（跨车间排产必须看到全部工作中心）。
CREATE TABLE IF NOT EXISTS work_centers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  -- 单班可用工时（小时）
  capacity_hours REAL DEFAULT 8,
  -- 日历班次数：1=单班 2=两班 3=三班
  shift_count INTEGER DEFAULT 1,
  -- 单位工时费率（元/小时），用于标准成本预估；正式核算走 production_rates
  hourly_rate REAL DEFAULT 0,
  -- 是否启用：停用后不参与排产但保留历史
  active INTEGER DEFAULT 1,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wc_org_code ON work_centers(org_id, code);
CREATE INDEX IF NOT EXISTS idx_wc_org ON work_centers(org_id);

-- ─────────────────────────────────────────────────────────────
-- ③ 成本费率（按期间生效，解决"用哪天的费率"）
-- ─────────────────────────────────────────────────────────────
-- 为什么按期间存多行而不是单值：同一批产品可能跨月完工，人工费率在 6 月调整过，
--   6 月前后的工时必须用**各自当时**的费率算，否则 6 月调价会让历史成本一起变
--   （对标 SAP 的成本要素有效期 / 金蝶的费率期间）。
-- rate_type：'labor'=人工费率（元/小时）、'machine'=机器费率（元/小时）
CREATE TABLE IF NOT EXISTS production_rates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  -- 该费率的生效起始日（YYYY-MM-DD）；取费率时取 effective_date <= 业务日期 的最新一条
  effective_date TEXT NOT NULL,
  rate REAL NOT NULL,
  -- 备注：为什么调（如"2026年社保上调"）
  remark TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
-- 同一组织+费率类型+生效日唯一（防重复录入同一生效日导致取费率时不确定）
CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_org_type_date
  ON production_rates(org_id, rate_type, effective_date);
CREATE INDEX IF NOT EXISTS idx_rate_lookup
  ON production_rates(org_id, rate_type, effective_date DESC);
