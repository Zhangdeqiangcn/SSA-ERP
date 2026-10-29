-- 迁移 0080：库存变动流水表（V3.46.0 第2批① · 对标审计 S-05 底座）
--
-- ═══════════════ 为什么必须建这张表 ═══════════════
-- 现状：inventory_records 是**当前余额快照**，每次过账只做
--   `quantity = quantity + ?` 原地累加（inventoryPosting.ts 的 postInbound/postOutbound），
--   全库**没有任何一张记录"为什么变"的流水表**。
-- 后果（这 5 条问题共用同一个病根，不建流水表就会复发）：
--   ① 出库超发被「两账本卡 0」静默吞掉，差异永不暴露；
--   ② 物料主数据 API 可直接改 current_stock/stock_value，物料账与库存账永久分叉；
--   ③ 盘点不过账（V3.46.0 已修，但历史差异仍无从追溯）；
--   ④ 调拨不过账（V3.46.0 已修，同上）；
--   ⑤ 前后端双轨滚成本（V3.46.0 已修）。
--   共同点：余额快照 + 原地累加的结构，会让**所有差异都被静默吸收**，
--   事后只能靠"当前值"倒推，last_inbound_date/last_outbound_date 还只保留最后一次。
--
-- 对标：SAP 的 MATDOC（物料凭证）——每一笔收货/发货/调拨/报废都是一条带数量、
--   金额、事务类型、期间的凭证，余额可随时由流水重建；金蝶/用友有库存流水账
--   与收发存汇总。**三家都从不原地改余额，而是一笔笔累加出余额。**
--
-- ═══════════════ 表设计要点 ═══════════════
-- · qty_delta / value_delta 带符号：入库为正、出库为负。这样 SUM 即可得当前余额，
--   与 inventory_records 互为校验（对账作业会比对两者，不一致即报警）。
-- · txn_type 用移动类型语义（inbound/outbound/transfer_in/transfer_out/adjust_gain/
--   adjust_loss/scrap/production），对标 SAP 移动类型，便于按类型追溯。
-- · 保留 doc_type + doc_no + doc_id：能反查到具体单据。
-- · dept_id：跨部门调拨时库存变化要能归属到部门（当前 RLS 依赖可为空的 dept_id，
--   静默失效 —— 见 S-27，本表先具备承载能力）。
-- · 不做物理删除：流水是账实追溯依据，删除单据时应作废（is_voided）而非删行。

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,

  -- 物料与仓位维度（与 inventory_records 对齐，保证可按同维度重建余额）
  material_id TEXT NOT NULL,
  material_code TEXT,
  material_name TEXT,
  warehouse_id TEXT,
  warehouse_name TEXT,
  location_id TEXT,
  batch_no TEXT,
  unit TEXT,

  -- 变动量（带符号：入库为正、出库为负）
  qty_delta REAL NOT NULL DEFAULT 0,
  value_delta REAL NOT NULL DEFAULT 0,
  unit_cost REAL NOT NULL DEFAULT 0,

  -- 业务类型与来源单据
  txn_type TEXT NOT NULL,          -- inbound | outbound | transfer_in | transfer_out | adjust_gain | adjust_loss | scrap | production
  doc_type TEXT,                   -- inbound_order | outbound_order | stock_transfer | inventory_adjustment | work_order
  doc_no TEXT,
  doc_id TEXT,
  doc_date TEXT,
  period TEXT,                     -- YYYY-MM，便于按会计期间汇总

  -- 责任与审计
  dept_id TEXT,
  user_id TEXT,
  user_name TEXT,
  remark TEXT,
  is_voided INTEGER NOT NULL DEFAULT 0,   -- 作废而非物理删除（流水是追溯依据）
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- 余额重建主查询：按物料+仓库汇总流水即得当前余额
CREATE INDEX IF NOT EXISTS idx_invtxn_balance
  ON inventory_transactions(org_id, material_id, warehouse_id);

-- 按单据反查（回答"这张单据产生了哪些库存变动"）
CREATE INDEX IF NOT EXISTS idx_invtxn_doc
  ON inventory_transactions(org_id, doc_type, doc_no);

-- 按期间汇总（回答"这个月库存怎么变的"）
CREATE INDEX IF NOT EXISTS idx_invtxn_period
  ON inventory_transactions(org_id, period);

INSERT INTO schema_migrations (version, applied_at)
VALUES ('0080_inventory_transactions', datetime('now'))
ON CONFLICT(version) DO NOTHING;
