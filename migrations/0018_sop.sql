-- V2.75.0 W0: S&OP 计划表（根治双通道参考实现，落真实 D1 关系表）
-- 与前端 createEntityStore({ resource: 'sop' }) + 注册 ENTITY_RESOURCES.sop 同源。
CREATE TABLE IF NOT EXISTS sop_plans (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  plan_no TEXT NOT NULL,
  period TEXT,
  demand_forecast REAL DEFAULT 0,
  supply_plan REAL DEFAULT 0,
  balance_qty REAL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  owner TEXT,
  remark TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_sop_plans_org ON sop_plans(org_id);

INSERT INTO schema_migrations (version, applied_at) VALUES ('0018_sop', datetime('now'))
ON CONFLICT(version) DO NOTHING;
