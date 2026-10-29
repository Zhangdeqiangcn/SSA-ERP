-- 迁移 0103（B 类共享配置/留痕型本地 blob store 迁 D1 · V3.81.0 数据地基）
-- 背景：承接 V3.80（A 类 6 强协作型），本批 7 个 store 仍走整块 blob（backendStorage /api/state/:key），
--   多人同时改配置/共享留痕会触发整块 409 冲突/换端看不到别人配的。迁 D1 行级根治。
-- 范式（沿用 V3.77/V3.80 payload 列范式）：
--   · config 型（customFields/alertRules）：整对象 JSON 作单行 payload（writeConfig + subscribe 写穿 + 挂载水合），
--     行主键 = 固定 config id。
--   · 逐行型（fmea）：一记录一行，行主键 = 对象 id。
--   · 双切片型（integration/lowCode/workflow/analytics）：单表 __kind 标记在 payload 内分流，行主键 = 各对象 id。
-- 后端通用实体路由 /api/entities/<resource> 提供 CRUD + org 隔离 + RLS + 审计；
-- 前端 store 保留原方法名，内部改走 entityRepo（本地乐观 + 登录态写穿 + 未登录/离线种子兜底 + 挂载水合）。

-- custom_fields（customFieldStore：三实体自定义字段定义，整块 EntityFields 单行 config）
CREATE TABLE IF NOT EXISTS custom_fields (
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

-- alert_rules（alertRuleStore：异常预警规则 6 条，整块 rules 单行 config，行主键 = 'config'）
CREATE TABLE IF NOT EXISTS alert_rules (
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

-- fmea_items（fmeaStore：FMEA 分析记录，逐行 rowkey = FMEA.id）
CREATE TABLE IF NOT EXISTS fmea_items (
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

-- integration_shared（integrationStore 双切片：webhooks + webhookLogs，__kind 分流，rowkey = 各对象 id）
CREATE TABLE IF NOT EXISTS integration_shared (
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

-- low_code_shared（lowCodeStore 双切片：formDefinitions + formRecords，__kind 分流）
CREATE TABLE IF NOT EXISTS low_code_shared (
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

-- workflow_shared（workflowStore 双切片：definitions + instances，__kind 分流）
CREATE TABLE IF NOT EXISTS workflow_shared (
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

-- analytics_shared（analyticsStore 双切片：forecastSuggestions + ocrHistory，__kind 分流）
CREATE TABLE IF NOT EXISTS analytics_shared (
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
