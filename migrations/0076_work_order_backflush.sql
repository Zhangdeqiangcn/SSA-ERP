-- 迁移 0076：生产倒冲发料（backflush）—— 幂等标记与留痕列
--
-- ═══════════════ 背景：差距 13「生产倒冲发料」═══════════════
-- 系统此前**没有任何**「完工自动按 BOM 扣减原料」的实现，且存在两条彼此独立的手工通路：
--   ① 「生成领料出库」→ 生成 pick 出库单 → 库存扣减（服务端 postOutbound 权威扣账）；
--   ② 「生成成品入库」→ 只回写工单状态 + 生成成品入库单，**对原料零动作**。
-- 结果是：只要没人记得点第①步，成品就凭空入库了 —— 原料账不动、材料成本不进工单，
-- 账实不符且没有任何地方会提示。重复制造模块里那个已经叫 "backflush" 的报工，
-- 也只是把数字累加进台账（repetitiveMfgStore.reportProduction），同样不扣账。
--
-- 本次把「完工即按 BOM 倒冲扣料」下沉到服务端（functions/_shared/backflush.ts），
-- 由 work-orders 的 PUT 在「状态首次进入 completed」时触发，绕开界面亦生效。
--
-- ═══════════════ 为什么必须新增这几列 ═══════════════
-- · work_orders.inventory_posted —— **幂等守卫**。工单表原本没有这个标记（对比
--   purchase_orders / outbound_orders 早就有）。没有它就无法区分「这张工单的原料
--   是否已经倒冲过」，网络重试或重复提交会导致重复扣料。
--   这是参照 outbound_orders 的既有模式（0005_purchase_orders.sql:150）补齐的对齐项。
--
-- · work_orders.backflush_outbound_no —— 倒冲生成的出库单号。留一个能从工单直接
--   追到出库单的指针；否则事后想核对「这批原料到底什么时候扣的、扣了多少」，
--   只能靠出库单的 remarks 文本反查，脆弱且易错。
--
-- · work_order_pickings.backflush_quantity / backflush_outbound_no —— 领料台账里
--   把「手工领料」与「自动倒冲」两个来源**分开留痕**。
--   为什么要分开：quantity 列表示「该工单该物料的累计耗用」（手工 + 倒冲），
--   倒冲算「还差多少要扣」时用的正是这个累计值；如果不同时留下倒冲的份额，
--   事后就无法回答「这 120 件里有 100 件是人工领的、20 件是倒冲的」。
--   ⚠️ 刻意【不】改 work_order_pickings 的 UNIQUE(org_id, work_order_id, material_id)：
--     改唯一键在 SQLite 里要重建表 + INSERT…SELECT，而该表已有存量数据、
--     又带着 version 列（迁移 0072），重建的列集很容易与全新库跑出来的不一致
--     （这正是坑 ㉘②「迁移可分叉」）。用 UPSERT 累加到同一行即可达到目的。
--
-- · 兼容性：全部为 ADD COLUMN + 带默认值，老数据自动取 0 / NULL，
--   不改变任何既有写入路径与读取形状（前端 WorkOrder 类型不需要新增字段即可工作）。
--
-- ═══════════════ 与 RLS 的关系 ═══════════════
-- 本迁移**没有新建表**，故无需在 functions/_shared/rls.ts 的 RLS_SCOPE 中登记
-- （work_orders 与 work_order_pickings 早已登记）。新增列不改变行级归属。

PRAGMA foreign_keys = ON;

-- ── 一、工单：倒冲幂等标记 + 出库单号留痕 ──────────────────────────
ALTER TABLE work_orders ADD COLUMN inventory_posted BOOLEAN DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN backflush_outbound_no TEXT;

-- ── 二、领料台账：区分「手工领料」与「自动倒冲」两个来源 ────────────
-- backflush_quantity 默认 0 → 存量行全部被正确解释为「纯手工领料」
ALTER TABLE work_order_pickings ADD COLUMN backflush_quantity REAL DEFAULT 0;
ALTER TABLE work_order_pickings ADD COLUMN backflush_outbound_no TEXT;

-- ── 三、存量行回填（ADD COLUMN 带 DEFAULT 时新行为默认值，此处兜底历史 NULL）──
-- 若不回填，`COALESCE(backflush_quantity,0)` 之外的裸比较（如 backflush_quantity > 0）
-- 在 NULL 上会得 NULL（非真非假），统计口径容易出怪数。
UPDATE work_orders SET inventory_posted = 0 WHERE inventory_posted IS NULL;
UPDATE work_order_pickings SET backflush_quantity = 0 WHERE backflush_quantity IS NULL;

-- 登记迁移
INSERT INTO schema_migrations (version, applied_at)
VALUES ('0076_work_order_backflush', datetime('now'))
ON CONFLICT(version) DO NOTHING;
