-- V3.63.0 供应商绩效关系化（根治审计 P1-VP-1 零后端孤岛）：
-- 把供应商绩效从 app_state Blob 迁为真实 D1 关系表，使采购评标/质量反馈可回写评级。
CREATE TABLE IF NOT EXISTS vendor_performance (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  vendor_id TEXT,
  vendor_name TEXT,
  vendor_code TEXT,
  period TEXT,
  quality_score REAL DEFAULT 0,
  delivery_score REAL DEFAULT 0,
  price_score REAL DEFAULT 0,
  service_score REAL DEFAULT 0,
  total_score REAL DEFAULT 0,
  ranking TEXT,
  remarks TEXT,
  evaluated_by TEXT,
  evaluated_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
