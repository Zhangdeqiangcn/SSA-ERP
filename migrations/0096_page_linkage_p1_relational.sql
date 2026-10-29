-- V3.66.0 页面级联动审计 P1 关系化（多终端不可见 → 多用户共享真源）：
-- ① scheduling_locks：详细工序排程锁（工单:工序 维度锁/手工锚定开始日，Record 形式一行一锁）
-- ② rebate_rules / rebate_settlements：返利规则与结算（财务返利计提可按行引用）
-- ③ sales_contracts：销售合同（履约跟踪/回款计划；items/付款计划/附件封 extra_json）
-- 设计取舍：嵌套明细（合同 items/paymentSchedule/附件）封 extra_json（框架自动 JSON 序列化），
-- 与 V3.63/64 退货/质量/框架协议范式一致，不改框架。

CREATE TABLE IF NOT EXISTS scheduling_locks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  lock_key TEXT NOT NULL,
  locked INTEGER DEFAULT 1,
  anchor_date TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  UNIQUE (org_id, lock_key)
);

CREATE TABLE IF NOT EXISTS rebate_rules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  material_id TEXT,
  material_name TEXT,
  type TEXT,
  rate REAL DEFAULT 0,
  min_amount REAL,
  valid_from TEXT,
  valid_to TEXT,
  enabled INTEGER DEFAULT 1,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS rebate_settlements (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  rule_id TEXT,
  rule_name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  period TEXT,
  base_amount REAL DEFAULT 0,
  rebate_amount REAL DEFAULT 0,
  status TEXT,
  settled_at TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS sales_contracts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  contract_no TEXT,
  name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  customer_code TEXT,
  sales_person TEXT,
  amount REAL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  terms TEXT,
  remarks TEXT,
  extra_json TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
