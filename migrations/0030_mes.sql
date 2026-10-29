-- V2.80.0 W1：MES 集成迁真实 D1（根治双通道，4 张子表）
-- 与前端 useMesStore（entityRepo 资源 mesConnections/mesDevices/mesWips/mesOperationReports）同源。
CREATE TABLE IF NOT EXISTS mes_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT,
  endpoint TEXT,
  protocol TEXT,
  status TEXT DEFAULT 'inactive',
  api_key TEXT,
  last_sync_at TEXT,
  note TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_mes_connections_org ON mes_connections(org_id);

CREATE TABLE IF NOT EXISTS mes_devices (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  device_code TEXT,
  device_name TEXT,
  work_center TEXT,
  oee REAL DEFAULT 0,
  reported_at TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_mes_devices_org ON mes_devices(org_id);

CREATE TABLE IF NOT EXISTS mes_wips (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  work_order_id TEXT,
  work_order_no TEXT,
  product_code TEXT,
  product_name TEXT,
  station TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_mes_wips_org ON mes_wips(org_id);

CREATE TABLE IF NOT EXISTS mes_operation_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  work_order_id TEXT,
  work_order_no TEXT,
  operation_name TEXT,
  work_center TEXT,
  good_quantity REAL DEFAULT 0,
  scrap_quantity REAL DEFAULT 0,
  reported_at TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_mes_operation_reports_org ON mes_operation_reports(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0030_mes', datetime('now'))
ON CONFLICT(version) DO NOTHING;
