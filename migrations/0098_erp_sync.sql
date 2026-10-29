-- ═══════════════════════════════════════════════════════════════════════════
-- 0098 外部 ERP 数据同步：连接配置 + 运行历史 + 逐行结果
-- ───────────────────────────────────────────────────────────────────────────
-- 背景（V3.68.0）：补齐「对接其他 ERP 进行数据同步备份」能力。
--   ① 统一数据 API（functions/api/data）已能对任意业务表读/写/改，本迁移提供
--      同步机制的「配置与账本」：连接配置描述「对方是谁、怎么鉴权、字段怎么对」，
--      运行历史与逐行结果让每一次同步都可审计、可复盘。
--   ② 引擎 erpSync.ts 是通用可配置 REST 适配器：不绑定任何品牌（金蝶/用友/SAP/
--      自建系统皆可），字段映射模板驱动，支持「推送（本系统→外部）」与
--      「拉取（外部→本系统，等效互备）」双向，增量游标 + 幂等 + 失败聚合不中断。
--   ③ 三张表均为组织级共享配置/账本，登记 rls.ts 的 RLS_SCOPE 为 'all'（与
--      backupSchema 的 discoverTables 同口径：排除系统表，仅业务表可同步）。
--
-- 设计取舍：
--   · auth_config / mapping_profile 用 TEXT 存 JSON（extra_json 范式，与本项目
--     框架协议/合同明细一致），避免为每家 ERP 的字段差异建死表结构。
--   · direction 单字段（push|pull|both）覆盖「备份方向」；增量游标用
--     last_synced_at（连接级，足够 v1；按表细粒度可在 run_items 推算）。
--   · run_items 落逐行结果，便于「哪一行推失败、为什么」精确复盘。
-- ═══════════════════════════════════════════════════════════════════════════

-- ① 连接配置：描述一个外部 ERP 目标
CREATE TABLE IF NOT EXISTS erp_sync_connections (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL,
  name            TEXT NOT NULL,
  enabled         INTEGER NOT NULL DEFAULT 1,          -- 0 停用 / 1 启用
  target_type     TEXT NOT NULL DEFAULT 'rest',        -- 当前仅 'rest'（可扩展 odata/soap）
  base_url        TEXT NOT NULL,                       -- 对方 REST 基址，如 https://erp-b.example.com/api
  auth_type       TEXT NOT NULL DEFAULT 'bearer',      -- bearer | basic | apikey | none
  auth_config     TEXT,                                -- JSON: {token} | {username,password} | {header_name,header_value}
  mapping_profile TEXT,                                -- JSON: { tables: { 本地表: { resource, idField, fields:{本地列:对方列} } }, pullTables?: {...} }
  direction       TEXT NOT NULL DEFAULT 'push',        -- push | pull | both
  schedule_cron   TEXT,                                -- 可选定时（cron 表达式），由外部调度触发 /run
  last_synced_at  TEXT,                                -- 增量游标：上次成功推送的最大 updated_at
  created_at      TEXT,
  updated_at      TEXT,
  created_by      TEXT,
  updated_by      TEXT
);
CREATE INDEX IF NOT EXISTS idx_erpsync_conn_org ON erp_sync_connections(org_id);

-- ② 运行历史：每次触发同步记一笔
CREATE TABLE IF NOT EXISTS erp_sync_runs (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  direction    TEXT NOT NULL,                          -- push | pull
  status       TEXT NOT NULL,                          -- running | success | partial | failed
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  totals       TEXT,                                   -- JSON: { pushed, pulled, errors }
  summary      TEXT,
  created_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_erpsync_run_conn ON erp_sync_runs(connection_id);

-- ③ 逐行结果：哪一行成功/失败，便于精确复盘
CREATE TABLE IF NOT EXISTS erp_sync_run_items (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  run_id        TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  direction     TEXT NOT NULL,                          -- push | pull
  local_id      TEXT,
  remote_id     TEXT,
  status        TEXT NOT NULL,                          -- ok | error | skipped
  message       TEXT,
  created_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_erpsync_item_run ON erp_sync_run_items(run_id);
