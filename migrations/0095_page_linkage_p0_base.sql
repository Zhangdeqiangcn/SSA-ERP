-- V3.66.0 页面级联动审计 5 项 P0 数据地基（先坐实前提再建表，铁律㊸）：
-- ① inspection_lots：检验批台账关系化——服务端 checkQualityBlocked 读 D1 拦截，
--    台账此前是 qualityAdvancedStore 的 Blob，两边不同源（"台账已闭环、拦截仍拦"错位）。
--    注：报告误标"0090 已建"，实际 0090 只建了 tasks/standards/unqualified/pdca 四表。
-- ② numbering_rules：编号规则 D1 化——服务端建单若取号须读组织侧配置，
--    此前纯浏览器 Blob，多终端/重新部署会漂移撞号。
-- ③ batch_records：批次台账独立表——批次级成本/库位对账此前只能按物料粒度近似。
-- ④ unqualified_items 加 vendor_id 列：生产投诉/客户退货追责供应商时，NCR 需带供应商
--    归属（此前只记 materialCode，追责链断在"该找哪家供应商"）。
-- 设计取舍：编号/模板/字典三张配置表本轮只做「D1 主源 + 启动水合 + 离线本地兜底」，
--   服务端建单端点消费（nextNo 服务端取号）留后续独立立项——避免一次改 9+ 建单端点扩大回归面。

CREATE TABLE IF NOT EXISTS inspection_lots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  lot_no TEXT,
  source_type TEXT,
  source_no TEXT,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  batch_no TEXT,
  quantity REAL DEFAULT 0,
  vendor_id TEXT,
  vendor_name TEXT,
  inspection_task_no TEXT,
  status TEXT,
  created_from TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS numbering_rules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  doc_type TEXT,
  prefix TEXT,
  separator TEXT,
  date_pattern TEXT,
  seq_length INTEGER DEFAULT 4,
  current_seq INTEGER DEFAULT 0,
  label TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS batch_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  batch_no TEXT,
  material_id TEXT,
  material_code TEXT,
  material_name TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  location_id TEXT,
  quantity REAL DEFAULT 0,
  cost REAL,
  production_date TEXT,
  expiry_date TEXT,
  inbound_no TEXT,
  inbound_date TEXT,
  supplier_name TEXT,
  status TEXT,
  locked INTEGER DEFAULT 0,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- ③ order_templates：订单模板 D1 化（采购订单模板，items 明细封 extra_json）
CREATE TABLE IF NOT EXISTS order_templates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  payment_terms TEXT,
  trade_terms TEXT,
  delivery_terms TEXT,
  remarks TEXT,
  expected_delivery_date TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

-- ④ data_dict：数据字典 D1 化（每值一行，category + item_value 组织内唯一）
CREATE TABLE IF NOT EXISTS data_dict (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  category TEXT NOT NULL,
  item_value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE (org_id, category, item_value)
);

-- 质量追责链补供应商归属（P0-3 生产投诉 / P0-4 客户退货 推供应商门户时锚定 vendor）
ALTER TABLE unqualified_items ADD COLUMN vendor_id TEXT;
ALTER TABLE unqualified_items ADD COLUMN vendor_name TEXT;
