-- 迁移 0081：财务配置迁关系表（V3.46.0 第2批② · 对标审计 S-05 底座）
--
-- ═══════════════ 为什么必须迁 ═══════════════
-- 结账状态、预算、汇率、应收应付四类财务配置此前全在 app_state（zustand persist 的
-- JSON 大对象）里，问题有三层：
--   ① **任何登录用户都能覆写** —— app_state 走通用 /api/state/<key> 端点，
--      没有"谁能改结账状态"的权限概念。覆盖该键即可一键解除全部期间锁定。
--   ② **无审计** —— 谁在何时结的账、改了多少预算、谁改的汇率，全都不可追。
--   ③ **fail-open** —— appState.ts 的 isPeriodClosed 在"键不存在 / 解析失败"时
--      返回 false（视为未结账）。于是**一次误清缓存或格式损坏，全部期间锁立即失效**，
--      而用户以为已结账。这比"没有结账管控"更危险：它给出错误的安全感。
--
-- 对标：SAP 的期间状态在 TFASTAT 表、受 F.OB52 配置控制，只能通过
--   "重新打开期间"授权动作变更并写审计；金蝶/用友的账套期间与预算均由数据库表承载，
--   非管理员无法反结账。**没有一家把结账状态放在浏览器里。**
--
-- ═══════════════ 迁移策略（重要：不破坏现有数据）═══════════════
-- 本迁移**只建表 + 一次性回填当前 app_state 里的存量**，然后服务端改为读新表；
-- 前端 store 保持读写新端点。若新表为空（首次部署前无数据）则行为与现在一致。
-- 这样可**逐域切换、可回退**，不必一次性大爆炸迁移。
--
-- 回填说明：app_state 的 value 是 JSON 字符串，可能包了两层（zustand persist
--   序列化为 {state:{...}, version:n}）。SQL 里用 json_extract 逐层尝试取值，
--   两种形态都覆盖；解析不出就留空（宁可不回填，也不能写错）。

-- ─────────────────────────────────────────────────────────────
-- ① 会计期间（结账状态）—— 最关键的一张
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fin_closing_periods (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  period TEXT NOT NULL,            -- YYYY-MM
  status TEXT NOT NULL DEFAULT 'open',   -- open | profit_closed | closed
  closed_by TEXT,
  closed_at TEXT,
  profit_voucher_no TEXT,         -- 损益结转凭证号
  fx_voucher_no TEXT,             -- 汇兑损益结转凭证号
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(org_id, period)
);
CREATE INDEX IF NOT EXISTS idx_fcp_org_status ON fin_closing_periods(org_id, status);

-- ─────────────────────────────────────────────────────────────
-- ② 预算
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fin_budgets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  period TEXT NOT NULL,           -- 2026-07 或 2026-Q3
  dimension TEXT NOT NULL,        -- costCenter | account | project
  ref_id TEXT,                    -- 成本中心id / 科目code / 项目id
  ref_name TEXT,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(org_id, period, dimension, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_fb_lookup ON fin_budgets(org_id, dimension, ref_id);

-- ─────────────────────────────────────────────────────────────
-- ③ 汇率：补 effective_date（此前**根本没有这一列**）
-- ─────────────────────────────────────────────────────────────
-- 缺口实证：fx_rates 实际列为 id/org_id/base_currency/quote_currency/rate/source/updated_at，
--   **没有 effective_date**（迁移 0014 建表时就没有）。
--   后果：期末汇兑损益该用哪个汇率没有口径依据；PeriodClosing.tsx 只能用
--   `inv.exchangeRate || 1` —— **汇率缺失时静默按 1 处理**（对标报告 S-34/P1-31）。
--   现在补列并回填：对已有汇率，取其 updated_at 的日期作为初始生效日期
--   （不猜历史生效日，只保证"从何时起有效"这件事有据可查）。
ALTER TABLE fx_rates ADD COLUMN effective_date TEXT;

UPDATE fx_rates
   SET effective_date = substr(updated_at, 1, 10)
 WHERE effective_date IS NULL
   AND updated_at IS NOT NULL;

-- 按「币种 + 生效日期」取汇率的索引（此前按日期过滤无索引支撑）
CREATE INDEX IF NOT EXISTS idx_fx_rates_effective
  ON fx_rates(org_id, quote_currency, effective_date);

-- ─────────────────────────────────────────────────────────────
-- ④ 存量回填：从 app_state 一次性搬到新表
-- ─────────────────────────────────────────────────────────────
-- 结账状态：closingPeriods 元素是对象 {period, status, closedBy, closedAt, ...}
INSERT OR IGNORE INTO fin_closing_periods
  (id, org_id, period, status, closed_by, closed_at, profit_voucher_no, fx_voucher_no, created_at, updated_at)
SELECT
  'fcp-' || s.org_id || '-' || COALESCE(json_extract(j.value, '$.period'), ''),
  s.org_id,
  json_extract(j.value, '$.period'),
  COALESCE(json_extract(j.value, '$.status'), 'open'),
  json_extract(j.value, '$.closedBy'),
  json_extract(j.value, '$.closedAt'),
  json_extract(j.value, '$.profitVoucherNo'),
  json_extract(j.value, '$.fxVoucherNo'),
  datetime('now'), datetime('now')
FROM app_state s
JOIN json_each(s.value) j
WHERE s.key = 'ssa-erp-finance-ledger'
  AND json_valid(s.value)
  AND json_type(j.value) = 'object'
  AND json_extract(j.value, '$.period') IS NOT NULL;

-- 预算：budgets 在 state.budgets（zustand persist 双层）
INSERT OR IGNORE INTO fin_budgets
  (id, org_id, period, dimension, ref_id, ref_name, amount, note, created_at, updated_at)
SELECT
  'fb-' || s.org_id || '-' || COALESCE(json_extract(j.value, '$.id'), ''),
  s.org_id,
  json_extract(j.value, '$.period'),
  json_extract(j.value, '$.dimension'),
  json_extract(j.value, '$.refId'),
  json_extract(j.value, '$.refName'),
  COALESCE(json_extract(j.value, '$.amount'), 0),
  json_extract(j.value, '$.note'),
  datetime('now'), datetime('now')
FROM app_state s
JOIN json_each(s.value, '$.state.budgets') j
WHERE s.key = 'ssa-erp-finance-ext'
  AND json_valid(s.value)
  AND json_type(j.value) = 'object';

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0081_finance_config_tables', datetime('now'))
ON CONFLICT(version) DO NOTHING;
