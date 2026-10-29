-- ─────────────────────────────────────────────────────────────
-- 迁移 0085：仓库主数据迁真实 D1（W4 整改，根治前端 zustand persist 单人不共享）
--
-- ════════════════ 为什么需要单独一张表 ═════════════════════════
-- 旧实现：仓库/库位主数据存前端 localStorage（key=ssa-erp-warehouse-master），
--   ① 单人本地、多人不同步（甲改了仓库名，乙看不到）；
--   ② 与后端库存/入库/出库单的 warehouseId 无统一权威源 —— 前端改个仓库名，
--      后端 inventory_records.warehouse_name 还是旧名（W4 根因：账面与界面不同源）。
--   现建 warehouses 表，org 隔离（RLS_SCOPE='all'，仓库主数据是全组织共享基础资料，
--   与 materials / bom_headers 同属性），locations 以 JSON 文本内联存储
--   （库位从属仓库、无独立查询维度，内联避免再开子表、也便于随仓库整体读写）。
--
-- 口径：新表一律显式登记到 rls.ts 的 RLS_SCOPE（否则 ① 登记表↔库 核对会判漏登记）。

CREATE TABLE IF NOT EXISTS warehouses (
  id         TEXT PRIMARY KEY,
  org_id     TEXT NOT NULL,
  code       TEXT NOT NULL,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'raw',   -- raw/finished/wip/aux/transit
  address    TEXT,
  manager    TEXT,
  status     TEXT NOT NULL DEFAULT 'active', -- active/disabled
  locations  TEXT,                          -- JSON 数组：WarehouseLocation[]
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_org_code ON warehouses(org_id, code);
CREATE INDEX IF NOT EXISTS idx_warehouses_org ON warehouses(org_id);
