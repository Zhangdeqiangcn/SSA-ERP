-- 补齐生产库缺失的 8 个索引（V2.97.0 修复）
--
-- 背景：迁移 0005 / 0006 / 0007 当年先上线，这些索引语句是后来才补进脚本内容的；
--   而 wrangler 只按「文件名是否已登记」判断是否重放，已应用的迁移永不重跑，
--   因此生产库从未获得它们（全新库则正常拥有），造成「生产静默缺索引」的差异。
--   本迁移专门为存量库（生产）补齐，语句与 0005/0006/0007 中的定义逐字一致。
--
-- 幂等性：全部带 IF NOT EXISTS —— 对已经拥有这些索引的库（全新库、本地库）为无操作。
-- 安全性：已预先核实生产 inventory_records 不存在 (org_id, material_id, warehouse_id)
--   重复组合（重复组数 = 0），故唯一索引可安全创建。

-- 采购订单
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor     ON purchase_orders(org_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status     ON purchase_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(org_id, order_date DESC);

-- 销售订单
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer      ON sales_orders(org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status        ON sales_orders(org_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date    ON sales_orders(org_id, order_date DESC);

-- 销售订单明细
CREATE INDEX IF NOT EXISTS idx_soi_order                  ON sales_order_items(sales_order_id);

-- 库存记录（唯一索引：同一组织 + 物料 + 仓库 只应有一条库存行）
CREATE UNIQUE INDEX IF NOT EXISTS idx_inv_unique          ON inventory_records(org_id, material_id, warehouse_id);
