-- 0072: 乐观锁全量铺开（缺陷台账 #10 完整范围）——核心业务单据表补 version 列
--
-- 背景：乐观锁（optimisticLock.withVersionGuard）此前仅接在 采购单/销售单/入库单/出库单/工单
--       五个端点（迁移 0020 / 0045 / 0071）。其余核心单据并发编辑同一条记录时，后提交者会
--       **静默覆盖**先提交者的改动，且没有任何提示。
-- 方案：给下列表统一补 version 列（模式同 0045 / 0071：ADD COLUMN + 存量回填 1）。
--       写入侧：单表单据在各 [id].ts 的 PUT 接入 withVersionGuard；通用父子框架在
--       parentChild.pcUpdate 内接入（一次覆盖 8 个父表）。
-- 兼容：前端不传 version 时保持原行为（不加锁），老客户端不受影响。
--
-- ★ 故意【不】加 version 的两张表（同名冲突，加了会破坏业务语义）：
--   - bom_headers.version     是 TEXT，表示「BOM 版本号」（0051_bom.sql:80）
--   - process_routes.version  是 TEXT，表示「工艺路线版本号」（0061_production_domain.sql:118）
--   这两处 version 是**业务字段**，不是并发锁版本，绝不能被当成锁覆盖或自增。

-- ── 一、单表单据端点（10 张）────────────────────────────────────
ALTER TABLE subcontract_orders ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE vouchers ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE stock_transfers ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE inventory_adjustments ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE quality_holds ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE serial_masters ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE materials ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE customers ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE vendor_master ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE work_order_pickings ADD COLUMN version INTEGER DEFAULT 1;

-- ── 二、通用父子框架父表（8 张，parentChild.pcUpdate 一次覆盖）────
ALTER TABLE purchase_requests ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE vendor_quotes ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE projects ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE shipments ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE sales_prospects ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE fin_payment_plans ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE fin_project_accounts ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE approval_flows ADD COLUMN version INTEGER DEFAULT 1;

-- ── 三、存量行回填（ADD COLUMN 带 DEFAULT 时新行为 1，此处兜底历史 NULL）──
UPDATE subcontract_orders SET version = 1 WHERE version IS NULL;
UPDATE vouchers SET version = 1 WHERE version IS NULL;
UPDATE stock_transfers SET version = 1 WHERE version IS NULL;
UPDATE inventory_adjustments SET version = 1 WHERE version IS NULL;
UPDATE quality_holds SET version = 1 WHERE version IS NULL;
UPDATE serial_masters SET version = 1 WHERE version IS NULL;
UPDATE materials SET version = 1 WHERE version IS NULL;
UPDATE customers SET version = 1 WHERE version IS NULL;
UPDATE vendor_master SET version = 1 WHERE version IS NULL;
UPDATE work_order_pickings SET version = 1 WHERE version IS NULL;
UPDATE purchase_requests SET version = 1 WHERE version IS NULL;
UPDATE vendor_quotes SET version = 1 WHERE version IS NULL;
UPDATE projects SET version = 1 WHERE version IS NULL;
UPDATE shipments SET version = 1 WHERE version IS NULL;
UPDATE sales_prospects SET version = 1 WHERE version IS NULL;
UPDATE fin_payment_plans SET version = 1 WHERE version IS NULL;
UPDATE fin_project_accounts SET version = 1 WHERE version IS NULL;
UPDATE approval_flows SET version = 1 WHERE version IS NULL;
