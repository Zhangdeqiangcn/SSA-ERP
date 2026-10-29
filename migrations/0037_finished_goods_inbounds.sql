-- V2.82.0 产成品入库迁真实 D1（根治 Blob 双通道最后一块，对齐实体范式）
-- 前端 warehouseStore.loadFinishedGoodsInbounds 经 /api/entities/finishedGoodsInbound 读写；
-- 字段全为标量（无嵌套 JSON），camel↔snake 在 functions/_shared/entities.ts 注册。
-- 与 ENTITY_RESOURCES.finishedGoodsInbound 同源。
CREATE TABLE IF NOT EXISTS finished_goods_inbounds (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  inbound_no TEXT NOT NULL,
  work_order_id TEXT,
  work_order_no TEXT,
  product_id TEXT,
  product_code TEXT,
  product_name TEXT,
  specification TEXT,
  unit TEXT,
  planned_qty REAL DEFAULT 0,
  actual_qty REAL DEFAULT 0,
  qualified_qty REAL DEFAULT 0,
  rejected_qty REAL DEFAULT 0,
  batch_no TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  location_id TEXT,
  location_name TEXT,
  inspection_task_id TEXT,
  status TEXT DEFAULT 'pending',
  operator TEXT,
  inbound_date TEXT,
  remarks TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_finished_goods_inbounds_org ON finished_goods_inbounds(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0037_finished_goods_inbounds', datetime('now'))
ON CONFLICT(version) DO NOTHING;
