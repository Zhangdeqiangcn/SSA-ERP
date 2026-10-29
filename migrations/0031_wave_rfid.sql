-- V2.80.0 W1：波次/RFID 迁真实 D1（根治双通道，2 张表）
-- 与前端 useWaveRfidStore（entityRepo 资源 waveRfid/waveRfidTag）同源。
-- wave_rfid.lines 以 TEXT 存 JSON 字符串（波次行明细），读写时序列化/反序列化。
CREATE TABLE IF NOT EXISTS wave_rfid (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  wave_no TEXT,
  name TEXT,
  status TEXT DEFAULT 'draft',
  strategy TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  order_count REAL DEFAULT 0,
  line_count REAL DEFAULT 0,
  planned_date TEXT,
  released_at TEXT,
  note TEXT,
  lines TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_wave_rfid_org ON wave_rfid(org_id);

CREATE TABLE IF NOT EXISTS wave_rfid_tags (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  tag_id TEXT,
  epc TEXT,
  op_type TEXT,
  biz_no TEXT,
  material_code TEXT,
  location TEXT,
  operator TEXT,
  scanned_at TEXT,
  result TEXT,
  message TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_wave_rfid_tags_org ON wave_rfid_tags(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0031_wave_rfid', datetime('now'))
ON CONFLICT(version) DO NOTHING;
