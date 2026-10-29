-- 迁移 0102（强协作型本地 blob store 迁 D1 · V3.80.0 数据地基）
-- 背景：backendStorage 通道把整个 store 状态打成「一整块 blob」按组织上云（/api/state/:key），
--   多人同时改里面不同记录会触发整块版本冲突（409）/互相覆盖/413 体积上限。
--   本批 6 个 store 存的都是「多人各写各的共享业务数据」，是最强协作痛点，优先迁 D1 行级。
-- 范式（沿用 V3.77 payload 列范式）：整对象 JSON 落 payload 列；多切片同表用 __kind 标记在 payload 内分流；
--   后端通用实体路由 /api/entities/<resource> 提供 CRUD + org 隔离 + RLS + 审计；
--   前端 store 保留原方法名，内部改走 entityRepo（本地乐观更新 + 登录态写穿 + 未登录/离线种子兜底 + 挂载水合）。

-- flow_shared（flowStore 8 切片：报检/供应商申请/订单确认/发货/质量问题/改进报告/对账/发票申请，__kind 分流）
CREATE TABLE IF NOT EXISTS flow_shared (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（含 __kind 标记）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- equipment_ledger（equipmentStore 双切片：设备台账 equipments + 保养工单 maintenanceOrders，__kind 分流）
CREATE TABLE IF NOT EXISTS equipment_ledger (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- invoice_verification（invoiceVerificationStore：数电票核验批次台账，行主键 = 批次 id）
CREATE TABLE IF NOT EXISTS invoice_verification (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- purchase_conditions（conditionStore：采购价格/折扣/运费条款，行主键 = 条款 id）
CREATE TABLE IF NOT EXISTS purchase_conditions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- source_lists（sourceListStore：货源清单，行主键 = 货源 id）
CREATE TABLE IF NOT EXISTS source_lists (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- slow_moving_disposals（slowMovingStore：呆滞物料处置决策，行主键 = materialId，天然一物料一行）
CREATE TABLE IF NOT EXISTS slow_moving_disposals (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
