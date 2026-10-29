-- V3.95.0 自动化设置中心（物料类别分工驱动的表单自动流转）
-- 落地强哥诉求：MRP 分解→采购需求→采购单/询价/寻源/领料/生产工单，是否发起、做到哪一步由管理员在「按物料分类」配置。
--
-- 范式对齐 system_settings / custom_fields（0103/0108）：整对象 JSON 落 payload 单列，
-- 通用实体路由 functions/api/entities/[resource] 接管，零新增后端函数；RLS 登 'all'（组织级共享配置）。
--   · automation_config：单行（id='automation-config'）存 全局默认 + 按分类覆盖 两段配置。
--   · automation_logs：  逐行存每次自动化触发（谁/何时/哪段/结果），供设置中心「运行日志」查询。

CREATE TABLE IF NOT EXISTS automation_config (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 整对象 JSON（{ global, perCategory }）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL DEFAULT 'default',
  payload TEXT,                      -- 单条日志 JSON（{ stage, categoryId, actor, action, result, at }）
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_by_name TEXT,
  updated_by_name TEXT
);
