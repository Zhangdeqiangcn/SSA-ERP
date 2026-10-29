-- V3.92.0 P1-5 仓储执行层（波次 / 拣货 / 配货 / 打包 / 发货校验）
-- 设计口径（对齐 0100/0101 范式）：
--   · org_id 隔离 + created_at/updated_at/created_by/updated_by/created_by_name/updated_by_name 审计列；
--   · 嵌套明细（order_ids）封 JSON 字符串列；
--   · 全部 CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS，可重复执行；
--   · 不新增源数据没有的唯一约束（按 org_id + 业务键 非唯一索引）。
-- 关联：waves.order_ids → order_hub.id；拣货/打包/发货校验均以 order_hub 为业务锚点。

-- ──────────────────────────────────────────────
-- 波次（waves）：订单集合的分拣批次
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waves (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  wave_no TEXT,
  status TEXT,            -- draft/released/picking/picked/packed/shipped
  order_ids TEXT,         -- JSON 数组：order_hub.id 列表
  remark TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_waves_org ON waves(org_id);
CREATE INDEX IF NOT EXISTS idx_waves_status ON waves(org_id, status);

-- ──────────────────────────────────────────────
-- 拣货任务（pick_tasks）：波次拆出的 SKU 级拣货明细
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pick_tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  wave_id TEXT,
  order_hub_id TEXT,
  material_code TEXT,
  material_name TEXT,
  location_id TEXT,
  location_name TEXT,
  barcode TEXT,
  required_qty REAL DEFAULT 0,
  picked_qty REAL DEFAULT 0,
  status TEXT,            -- pending/picking/done/skipped
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_org ON pick_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_wave ON pick_tasks(org_id, wave_id);

-- ──────────────────────────────────────────────
-- 打包记录（pack_records）：配货 + 打包结果
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pack_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  wave_id TEXT,
  order_hub_id TEXT,
  pack_no TEXT,
  weight REAL,
  status TEXT,
  created_at TEXT,
  created_by TEXT,
  created_by_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_pack_records_org ON pack_records(org_id);
CREATE INDEX IF NOT EXISTS idx_pack_records_wave ON pack_records(org_id, wave_id);

-- ──────────────────────────────────────────────
-- 发货校验（ship_checks）：发货前条码 / 数量核对
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ship_checks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  order_hub_id TEXT,
  pack_no TEXT,
  pass INTEGER DEFAULT 0,
  detail TEXT,            -- JSON：不符明细数组
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ship_checks_org ON ship_checks(org_id);
CREATE INDEX IF NOT EXISTS idx_ship_checks_order ON ship_checks(org_id, order_hub_id);
