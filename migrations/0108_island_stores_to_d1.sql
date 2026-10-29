-- 迁移 0101（全模块联动审计整改·V3.77 数据地基）
-- 将审计发现的本地孤岛 store 迁为 D1 关系表（统一 payload 列范式）。
-- 后端通用实体路由 /api/entities/<resource> 提供 CRUD + org 隔离 + RLS + 审计。
-- 前端 store 保留原有方法名，内部改走 entityRepo（本地乐观更新 + 登录态写穿 + 未登录种子兜底）。

-- ecns
CREATE TABLE IF NOT EXISTS ecns (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- production_versions
CREATE TABLE IF NOT EXISTS production_versions (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- production_ecns
CREATE TABLE IF NOT EXISTS production_ecns (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- price_inquiries
CREATE TABLE IF NOT EXISTS price_inquiries (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- price_quotations
CREATE TABLE IF NOT EXISTS price_quotations (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- price_comparisons
CREATE TABLE IF NOT EXISTS price_comparisons (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- price_approvals
CREATE TABLE IF NOT EXISTS price_approvals (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- price_lists
CREATE TABLE IF NOT EXISTS price_lists (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- coa_reports
CREATE TABLE IF NOT EXISTS coa_reports (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- vendor_portals
CREATE TABLE IF NOT EXISTS vendor_portals (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- sales_prices
CREATE TABLE IF NOT EXISTS sales_prices (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- material_extensions
CREATE TABLE IF NOT EXISTS material_extensions (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- quality_extensions
CREATE TABLE IF NOT EXISTS quality_extensions (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- material_approvals
CREATE TABLE IF NOT EXISTS material_approvals (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- finance_extensions
CREATE TABLE IF NOT EXISTS finance_extensions (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- report_permissions
CREATE TABLE IF NOT EXISTS report_permissions (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- data_permissions
CREATE TABLE IF NOT EXISTS data_permissions (
  -- id/org/审计列（与通用实体端点一致；presentCols 探测写，缺列不 500）
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（根治 Blob 双通道，落真实 D1）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);


-- system_users（设置侧用户目录，与鉴权 users 表解耦，根治本地孤岛 P0-2）
CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

-- system_orgs（设置侧组织目录，与鉴权 orgs 表解耦，根治本地孤岛 P0-2）
CREATE TABLE IF NOT EXISTS system_orgs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
