-- ─────────────────────────────────────────────────────────────
-- 迁移 0083：发票明细表（V3.47.0 第3批 3-05 · 三单匹配行级化的前提）
--
-- ═══════════════ 背景（为什么必须建）════════════════════════════
-- 三单匹配（采购订单 ⇄ 入库单 ⇄ 发票）目前只能做**金额维度**比对，代码里
-- 已写明能力边界（threeWayMatch.ts:21-25）：
--   「fin_invoices 表没有明细行，也就不存在『发票数量』这个数据。
--     三单匹配缺了一方的数量，数量维度无法构成比对。」
--
-- 后果是真实的数据准确性风险：同一张订单订 3 种物料，
--   · 实际收货 A×100、B×50（欠交 50）
--   · 发票只开了 A×100（金额与订单总额对得上，因为单价差恰好抵消）
--   → 金额维度全部通过，但 B 料**根本没到货也没收到发票**，
--     系统却判定"三单匹配通过"并放行付款。对标金蝶/用友/SAP：
--     三单匹配必须**按行（订单行）比对数量**，且支持容差与超差审批。
--
-- ═══════════════ 本表设计 ═══════════════���══════════════════════
-- 一行 = 一个发票行，对应采购订单的一行。
--
-- 为什么必须带 order_item_id（外键到 purchase_order_items.id）而不是只存
-- 物料编码：物料编码**不唯一**（同一物料可在一个订单里出现多行、不同单价/
-- 交期），只按编码匹配会把 A 行和 B 行并成一行，行级匹配失效。
--
-- quantity 的口径：与采购订单行**同一单位**（采购单位），不做单位换算 ——
--   换算口径属 unit_conversions 域，若在此处偷偷换算，一旦主数据换算率
--   事后被改，已入库的发票明细会与订单对不上（且无法复算）。
--   若前端录入的是 BOM 用量单位而非采购单位，应在录入侧换算并把换算率
--   记入 unit_conversion_rate，判定时按同一系数还原。
CREATE TABLE IF NOT EXISTS fin_invoice_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,              -- 发票头（fin_invoices.id）
  -- 行级对账锚点
  order_item_id TEXT,                    -- purchase_order_items.id（首选，行级精确匹配）
  material_id TEXT,                      -- 物料（冗余一份，便于按物料反查）
  material_code TEXT,
  material_name TEXT,
  -- 数量与金额
  quantity REAL DEFAULT 0,               -- 开票数量（采购单位）
  unit TEXT,
  unit_price REAL DEFAULT 0,             -- 不含税单价
  amount REAL DEFAULT 0,                 -- 不含税金额 = 数量 × 单价
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,           -- 含税金额
  -- 录入时的单位换算率（1 = 未换算）。留痕以便主数据换算率变更后可复算
  unit_conversion_rate REAL DEFAULT 1,
  -- 行级匹配容差（比例，0.02 = 2%）。行级比数量比金额更易受计量误差影响，
  -- 标杆做法是给容差；无容差会把正常的尾差判成超差。
  tolerance_rate REAL DEFAULT 0.02,
  -- 该行匹配结果：matched(一致) / short(欠交) / over(超交) / pending(未判定)
  match_status TEXT DEFAULT 'pending',
  match_note TEXT,
  created_at TEXT, updated_at TEXT, created_by TEXT, updated_by TEXT
);

-- 按发票查明细（最常用路径：发票详情页展示 + 行级匹配）
CREATE INDEX IF NOT EXISTS idx_inv_items_invoice
  ON fin_invoice_items(org_id, invoice_id);
-- 按订单行反查"这张订单的哪些行被开过票"（防重复开票的核心查询）
CREATE INDEX IF NOT EXISTS idx_inv_items_order_item
  ON fin_invoice_items(org_id, order_item_id);
-- 按物料反查（对账报表用）
CREATE INDEX IF NOT EXISTS idx_inv_items_material
  ON fin_invoice_items(org_id, material_code);

-- ─────────────────────────────────────────────────────────────
-- 补：入库明细的行锚点（行级三单匹配的另一前提）
--
-- 为什么要补：行级比对需要「入库行 → 订单行」的锚点。入库明细表原先**没有**
--   任何指向 purchase_order_items 的列，只有 source_no 指到订单头。
--   没有行锚点时，入库行只能退回按物料编码匹配 —— 而同一物料在一个订单里
--   可能出现多行（不同单价/交期），届时会把多行并成一行，比对结果失真。
--
-- ⚠️ 下面两句已移至 **迁移 0084**（inbound_order_item_anchor.sql）执行。
--   原因：0083 在追加这两句之前就已经 apply 过，而 D1 的 schema_migrations
--   按版本号记录、同一版本不会重跑 ⇒ 写在这里等于永不执行，且无任何报错。
--   **迁移一旦 apply 过即视为不可变，后续补充的 DDL 必须新建版本。**
-- ALTER TABLE inbound_order_items ADD COLUMN order_item_id TEXT;
-- CREATE INDEX IF NOT EXISTS idx_in_items_order_item
--   ON inbound_order_items(org_id, order_item_id);
