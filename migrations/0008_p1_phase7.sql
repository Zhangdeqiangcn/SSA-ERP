-- P1 Phase 7: 三单匹配服务端闭环
-- three_way_match 表：记录 PO/入库单/发票的匹配状态

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS three_way_match (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  po_id TEXT NOT NULL,
  po_no TEXT NOT NULL,
  inbound_id TEXT,
  inbound_no TEXT,
  invoice_id TEXT,
  invoice_no TEXT,
  match_status TEXT NOT NULL DEFAULT 'pending',
  -- 数量匹配
  po_quantity REAL NOT NULL DEFAULT 0,
  inbound_quantity REAL NOT NULL DEFAULT 0,
  qty_variance REAL NOT NULL DEFAULT 0,
  qty_match BOOLEAN NOT NULL DEFAULT 0,
  -- 单价匹配
  po_unit_price REAL NOT NULL DEFAULT 0,
  invoice_unit_price REAL NOT NULL DEFAULT 0,
  price_variance REAL NOT NULL DEFAULT 0,
  price_match BOOLEAN NOT NULL DEFAULT 0,
  -- 金额匹配
  po_amount REAL NOT NULL DEFAULT 0,
  inbound_amount REAL NOT NULL DEFAULT 0,
  invoice_amount REAL NOT NULL DEFAULT 0,
  amount_variance REAL NOT NULL DEFAULT 0,
  amount_match BOOLEAN NOT NULL DEFAULT 0,
  matched_by TEXT,
  matched_at TEXT,
  discrepancy TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_twm_po ON three_way_match(org_id, po_id);
CREATE INDEX IF NOT EXISTS idx_twm_status ON three_way_match(org_id, match_status);
CREATE INDEX IF NOT EXISTS idx_twm_inbound ON three_way_match(org_id, inbound_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0008_p1_phase7', datetime('now')) ON CONFLICT(version) DO NOTHING;
