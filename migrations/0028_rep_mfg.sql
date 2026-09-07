-- V2.80.0 W1：重复制造（产线 + 周期，含倒冲明细 JSON）迁真实 D1（根治双通道）
-- 与前端 useRepetitiveMfgStore（entityRepo 双资源 repMfgLine/repMfgPeriod）同源。
-- backflush_items 以 TEXT 存 JSON 字符串（D1 无原生 JSON 类型，前端读写时序列化/反序列化）。
CREATE TABLE IF NOT EXISTS rep_mfg_lines (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  line_no TEXT,
  name TEXT,
  work_center_id TEXT,
  work_center_name TEXT,
  status TEXT DEFAULT 'idle',
  daily_capacity REAL DEFAULT 0,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_rep_mfg_lines_org ON rep_mfg_lines(org_id);

CREATE TABLE IF NOT EXISTS rep_mfg_periods (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  period_no TEXT,
  line_id TEXT,
  line_no TEXT,
  line_name TEXT,
  material_code TEXT,
  material_name TEXT,
  start_date TEXT,
  end_date TEXT,
  planned_qty REAL DEFAULT 0,
  produced_qty REAL DEFAULT 0,
  scrap_qty REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  note TEXT,
  backflush_items TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_rep_mfg_periods_org ON rep_mfg_periods(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0028_rep_mfg', datetime('now'))
ON CONFLICT(version) DO NOTHING;
