-- V3.64.0 P0-3 销售退货↔采购退货串联（根治八模块审计：两张退货表无共同字段，供应商追责链断裂）
-- 此前 sales_returns / purchase_returns 各带 credit_note_no / voucher_no，但彼此无 source 关联，
-- 「客户退货(销售侧) → 应向供应商追责(采购侧)」全凭人工补单。现双向加一列关联单号：
--   · sales_returns.linked_purchase_return_no  →  指向它触发的采购退货单号
--   · purchase_returns.linked_sales_return_no  →  指回它的销售退货来源单号
-- 均可空（非质量类退货、或无法溯源供应商时为 NULL，诚实不造假）。
ALTER TABLE sales_returns ADD COLUMN linked_purchase_return_no TEXT;
ALTER TABLE purchase_returns ADD COLUMN linked_sales_return_no TEXT;
