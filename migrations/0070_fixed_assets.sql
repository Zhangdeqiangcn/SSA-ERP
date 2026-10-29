-- 迁移 0070：#13 折旧计提彻底服务端化 —— 固定资产从 app_state KV 迁入关系表
--
-- ═══════════════ 背景 ═══════════════
-- 旧实现（V3.15.x 及之前）把 fixed_assets 与 closingPeriods 一起塞进
--   app_state KV 键 `ssa-erp-finance-ledger`（一个 JSON 大对象），折旧计提
--   deprecateAll 在前端算、并往遗留表 fin_account_entries 写两条中文科目分录，
--   根本不产生权威会计凭证。这等于：① 数据不在关系库、绕开 RLS；② 计提无凭证、
--   无审计、可随意在前端改状态绕过结账管控（缺陷台账 #13）。
--
-- 现把 fixed_assets 迁入关系表，与 vouchers / fin_invoices 同属财务域（org 内全员可见）。
-- 计提动作改为服务端权威端点 /api/fixed-assets/depreciate：更新累计折旧 + 生成折旧凭证
-- （借 6602 管理费用-折旧 / 贷 1602 累计折旧），并受「已结账期间禁止记账」硬管控。
--
-- ═══════════════ 存量迁移（KV → 关系表）══════════════
-- 不在此迁移里写 INSERT（KV 数据按 org 各不同，且可能很大）。改为在
--   /api/fixed-assets GET 首次访问时做「惰性回填」：当某组织 D1 中 fixed_assets
--   计数为 0 且 KV 的 ssa-erp-finance-ledger.fixedAssets 有数据时，批量插入并回写。
--   幂等（仅当 D1 为空才回填），不重复、不丢数据。
--
-- ═══════════════ 列集说明 ═══════════════
-- 字段与前端 @/types/finance 的 FixedAsset 一一对应（camel → snake）：
--   asset_code / asset_name / category / original_value / residual_rate /
--   useful_life_months / start_date / monthly_depreciation / accumulated_depreciation /
--   net_value / depreciation_method / status / scrap_date / last_depreciation_period /
--   note / created_at / updated_at / created_by / updated_by
-- last_depreciation_period 为服务端新增：记录该资产最后一次成功计提的期间，
-- 用于 /depreciate 的幂等判断（同一期间重复计提不产生重复凭证）。

CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  asset_code TEXT,
  asset_name TEXT,
  category TEXT,
  original_value REAL NOT NULL DEFAULT 0,
  residual_rate REAL NOT NULL DEFAULT 0,
  useful_life_months INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  monthly_depreciation REAL NOT NULL DEFAULT 0,
  accumulated_depreciation REAL NOT NULL DEFAULT 0,
  net_value REAL NOT NULL DEFAULT 0,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  status TEXT NOT NULL DEFAULT 'in_use',
  scrap_date TEXT,
  last_depreciation_period TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_fixed_assets_org ON fixed_assets(org_id);
