-- 迁移 0013：行级安全(RLS)物理列
-- 给 10 张业务关系表加 owner_id / dept_id，支撑「应用层行级策略」（D1/SQLite 无原生 RLS）。
-- 默认 NULL = 遗留数据全员可见（向前兼容）。
-- 说明：本文件为规范迁移；生产部署时若 schema_migrations 登记漂移，
--       改用 `wrangler d1 execute --remote --command "$(cat 0013_*.sql)"` 内联补列（同 V2.70 经验）。

-- ── 业务单据表（按 owner 隔离：销售看自己客户/订单、采购看自己供应商/订单）──
ALTER TABLE customers      ADD COLUMN owner_id TEXT;
ALTER TABLE customers      ADD COLUMN dept_id  TEXT;
ALTER TABLE sales_orders   ADD COLUMN owner_id TEXT;
ALTER TABLE sales_orders   ADD COLUMN dept_id  TEXT;
ALTER TABLE vendors        ADD COLUMN owner_id TEXT;
ALTER TABLE vendors        ADD COLUMN dept_id  TEXT;
ALTER TABLE purchase_orders ADD COLUMN owner_id TEXT;
ALTER TABLE purchase_orders ADD COLUMN dept_id  TEXT;

-- ── 库存/出入库表（按 dept 隔离：仓库只看本部门）──
ALTER TABLE inbound_orders  ADD COLUMN owner_id TEXT;
ALTER TABLE inbound_orders  ADD COLUMN dept_id  TEXT;
ALTER TABLE outbound_orders ADD COLUMN owner_id TEXT;
ALTER TABLE outbound_orders ADD COLUMN dept_id  TEXT;
ALTER TABLE inventory_records ADD COLUMN owner_id TEXT;
ALTER TABLE inventory_records ADD COLUMN dept_id  TEXT;

-- ── 共享主数据表（materials/work_orders/vouchers 全员可见，仍加列备扩展）──
ALTER TABLE materials       ADD COLUMN owner_id TEXT;
ALTER TABLE materials       ADD COLUMN dept_id  TEXT;
ALTER TABLE work_orders     ADD COLUMN owner_id TEXT;
ALTER TABLE work_orders     ADD COLUMN dept_id  TEXT;
ALTER TABLE vouchers        ADD COLUMN owner_id TEXT;
ALTER TABLE vouchers        ADD COLUMN dept_id  TEXT;

-- 索引（加速行级过滤）
CREATE INDEX IF NOT EXISTS idx_customers_owner      ON customers(org_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_owner   ON sales_orders(org_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_vendors_owner        ON vendors(org_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_owner ON purchase_orders(org_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_inbound_dept         ON inbound_orders(org_id, dept_id);
CREATE INDEX IF NOT EXISTS idx_outbound_dept        ON outbound_orders(org_id, dept_id);
CREATE INDEX IF NOT EXISTS idx_inventory_dept       ON inventory_records(org_id, dept_id);
