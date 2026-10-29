-- V3.104.0：采购订单「行级供应商/预计交货/关联项目」+ 表头「交付条件」落库补列。
-- ① purchase_orders.delivery_terms：表单早有「交付条件」输入框，但建表（0005）时无此列，
--    POST/PUT 也未登记 → 用户填了静默丢弃（ship_date 同款「静默丢列」）。本轮一并根治。
-- ② purchase_order_items 行级 5 列：表单明细行早有供应商（vendorId/vendorName）、
--    预计交货（expectedDeliveryDate）三列，但 INSERT 固定 16 列不含它们 → 全部落库即丢，
--    编辑回显时整表被表头供应商覆盖。本轮强哥要求「关联项目放进明细行」，行级项目
--    （project_no/project_name）与上述三列同批补齐，一次根治。
ALTER TABLE purchase_orders ADD COLUMN delivery_terms TEXT;
ALTER TABLE purchase_order_items ADD COLUMN vendor_id TEXT;
ALTER TABLE purchase_order_items ADD COLUMN vendor_name TEXT;
ALTER TABLE purchase_order_items ADD COLUMN expected_delivery_date TEXT;
ALTER TABLE purchase_order_items ADD COLUMN project_no TEXT;
ALTER TABLE purchase_order_items ADD COLUMN project_name TEXT;
