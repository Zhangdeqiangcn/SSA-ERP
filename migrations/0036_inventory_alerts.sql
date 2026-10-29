-- V2.82.0 库存预警迁真实 D1（根治 Blob 双通道最后一块，对齐实体范式）
-- 前端 warehouseStore.loadInventoryAlerts 经 /api/entities/inventoryAlert 读写；
-- 字段全为标量（无嵌套 JSON），camel↔snake 在 functions/_shared/entities.ts 注册。
-- 与 ENTITY_RESOURCES.inventoryAlert 同源。
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  type TEXT DEFAULT 'low_stock',
  current_quantity REAL DEFAULT 0,
  threshold REAL DEFAULT 0,
  severity TEXT DEFAULT 'warning',
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_org ON inventory_alerts(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0036_inventory_alerts', datetime('now'))
ON CONFLICT(version) DO NOTHING;
